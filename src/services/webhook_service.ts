import axios from 'axios';

class WebhookService {
  async triggerWebhook(url: string, payload: any): Promise<void> {
    try {
      await axios.post(url, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000,
      });
      console.log(`Webhook successfully delivered to ${url}`);
    } catch (err: any) {
      console.error(`Failed to deliver webhook to ${url}:`, err.message);
    }
  }
}

export default new WebhookService();
