declare module 'africastalking' {
  interface AfricasTalkingOptions {
    apiKey: string;
    username: string;
  }

  interface SmsSendOptions {
    to: string[];
    message: string;
    from?: string;
  }

  interface SmsRecipient {
    number: string;
    status: string;
    messageId?: string;
    cost?: string;
  }

  interface SmsSendData {
    SMSMessageData: {
      Message: string;
      Recipients: SmsRecipient[];
    };
  }

  interface SmsService {
    send(options: SmsSendOptions): Promise<SmsSendData>;
  }

  interface AfricasTalkingInstance {
    SMS: SmsService;
  }

  function AfricasTalking(options: AfricasTalkingOptions): AfricasTalkingInstance;
  export = AfricasTalking;
}
