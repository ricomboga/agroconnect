import { PushTemplate } from '../sw/push.js';

type TemplateData = Record<string, string>;

export const enPushTemplates: Record<string, (data: TemplateData) => PushTemplate> = {
  'farm.created': (d) => ({
    title: 'Farm Registered',
    body: `Your farm in ${d['county'] ?? 'your area'} has been successfully registered.`,
  }),
  'farm.activity.completed': (d) => ({
    title: 'Activity Completed',
    body: `Your ${d['activityType'] ?? 'farming'} activity has been marked as complete.`,
  }),
  'farm.harvest.recorded': (d) => ({
    title: 'Harvest Recorded',
    body: `${d['quantityKg'] ?? '?'} kg of ${d['crop'] ?? 'produce'} harvest has been recorded.`,
  }),
  'diagnosis.completed': (d) => ({
    title: 'Diagnosis Result Ready',
    body: `Disease detected: ${d['diseaseName'] ?? 'Open the app for details'}.`,
  }),
  'finance.loan.applied': (d) => ({
    title: 'Loan Application Received',
    body: `Your loan application for KES ${d['amountKes'] ?? '?'} has been received. We will notify you shortly.`,
  }),
  'finance.loan.disbursed': (d) => ({
    title: 'Loan Disbursed',
    body: `KES ${d['amountKes'] ?? '?'} has been sent to your M-Pesa.`,
  }),
  'finance.payment.confirmed': (d) => ({
    title: 'Payment Confirmed',
    body: `Your payment of KES ${d['amountKes'] ?? '?'} has been confirmed.`,
  }),
  'finance.payment.failed': (d) => ({
    title: 'Payment Failed',
    body: `Payment of KES ${d['amountKes'] ?? '?'} failed. ${d['reason'] ? `Reason: ${d['reason']}` : 'Please try again.'}`,
  }),
  'market.listing.created': (d) => ({
    title: 'Listing Published',
    body: `Your ${d['cropType'] ?? 'produce'} listing is live at KES ${d['pricePerKg'] ?? '?'}/kg.`,
  }),
  'market.order.placed': (d) => ({
    title: 'New Order Received',
    body: `New order for ${d['cropType'] ?? 'produce'} worth KES ${d['totalKes'] ?? '?'} received.`,
  }),
  'market.order.updated': (d) => ({
    title: 'Order Status Updated',
    body: `Your order status has changed to: ${d['status'] ?? 'updated'}.`,
  }),
  'govt.registration.submitted': (d) => ({
    title: 'Farm Registration Submitted',
    body: `Registration for ${d['farmName'] ?? 'your farm'} has been submitted to the government.`,
  }),
  'weather.alert.issued': (d) => ({
    title: `Weather Alert — ${d['severity'] ?? ''}`,
    body: d['description'] ?? 'Check weather conditions in your area.',
  }),
  'community.post.created': (d) => ({
    title: 'New Community Post',
    body: `New post in ${d['category'] ?? 'community'}: "${d['title'] ?? ''}".`,
  }),
  'community.reply.created': (d) => ({
    title: `${d['replierName'] ?? 'Someone'} replied to your post`,
    body: `"${d['threadTitle'] ?? 'your post'}" has a new reply. Tap to read and respond.`,
  }),
  'community.article.created': (d) => {
    const type = d['type'] ?? 'news';
    const title = type === 'webinar' ? 'New Webinar' : type === 'event' ? 'New Event' : 'News Update';
    return {
      title,
      body: `${d['title'] ?? ''}. Tap for details.`,
    };
  },
  'user.registered': (d) => ({
    title: `Welcome to AgroConnect, ${d['fullName'] ?? ''}!`,
    body: 'Your account is ready. Start managing your farm today.',
  }),
  'farm.worker.assigned': (d) => ({
    title: `You've been added to ${d['farmName'] ?? 'a farm'}!`,
    body: `Role: ${d['workerRole'] ?? 'worker'}. Open AgroConnect to see your tasks.`,
  }),
  'notification.send': (d) => ({
    title: d['title'] ?? 'Message',
    body: d['body'] ?? '',
  }),
};
