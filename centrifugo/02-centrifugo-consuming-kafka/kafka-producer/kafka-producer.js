// kafka-producer.js
const { Kafka } = require('kafkajs');

// Configure KafkaJS client
const kafka = new Kafka({
  clientId: 'centrifugo-test-producer',
  brokers: ['kafka:9092'] // Use kafka:9092 when running inside Docker network
});

// Create a producer
const producer = kafka.producer();

// Track message count
let messageCount = 0;

async function sendMessageToKafka() {
  try {
    // Increment message count
    messageCount++;
    
    // Send a message to the configured topic
    const result = await producer.send({
      topic: 'centrifugo-messages',
      messages: [
        {
          // Format for Centrifugo v6 Kafka consumer
          value: JSON.stringify({
            method: "publish",
            payload: {
              channel: "chat:mychannel",
              data: {
                message: `Hello from Kafka! Message #${messageCount}`,
                timestamp: new Date().toISOString()
              }
            }
          })
        },
      ],
    });
    
    console.log(`Message #${messageCount} sent successfully:`, result);
    return result;
  } catch (error) {
    console.error(`Error sending message #${messageCount}:`, error);
    throw error;
  }
}

// Optional: Create a topic if it doesn't exist
async function createTopicIfNotExists() {
  const admin = kafka.admin();
  await admin.connect();
  
  try {
    const topics = await admin.listTopics();
    if (!topics.includes('centrifugo-messages')) {
      await admin.createTopics({
        topics: [
          {
            topic: 'centrifugo-messages',
            numPartitions: 1,
            replicationFactor: 1
          }
        ]
      });
      console.log('Topic created: centrifugo-messages');
    } else {
      console.log('Topic already exists: centrifugo-messages');
    }
  } finally {
    await admin.disconnect();
  }
}

// Send messages continuously
async function runContinuously() {
  try {
    // Connect to Kafka
    await producer.connect();
    console.log('Connected to Kafka');
    
    // Create topic if needed
    await createTopicIfNotExists();
    
    console.log('Starting continuous message sending (1 message per second)...');
    console.log('Press Ctrl+C to stop');
    
    // Send a message immediately
    await sendMessageToKafka();
    
    // Set up interval to send a message every second
    const intervalId = setInterval(async () => {
      try {
        await sendMessageToKafka();
      } catch (error) {
        console.error('Error in interval:', error);
        // If we have persistent errors, might want to clear the interval
        // clearInterval(intervalId);
      }
    }, 1000);
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('Stopping message production...');
      clearInterval(intervalId);
      await producer.disconnect();
      console.log('Disconnected from Kafka');
      process.exit(0);
    });
    
  } catch (error) {
    console.error('Failed to start continuous producer:', error);
    await producer.disconnect();
    process.exit(1);
  }
}

// Send a single message and exit
async function runOnce() {
  try {
    await producer.connect();
    await createTopicIfNotExists();
    await sendMessageToKafka();
  } catch (error) {
    console.error('Failed to run the producer:', error);
  } finally {
    await producer.disconnect();
  }
}

// Check arguments to determine mode
if (process.argv.includes('--once')) {
  console.log('Running in single message mode');
  runOnce().catch(console.error);
} else {
  console.log('Running in continuous mode (1 message per second)');
  runContinuously().catch(console.error);
}