# Echoes Within™ – Spiritual Music Event Booking Platform

A modern, responsive event booking website for spiritual music experiences and Bhajan Clubbing events.

Users can select plans, book tickets, pay via QR (UP​I), and receive real-time email confirmations.

---

## Features

• Beautiful modern UI with dark/light theme  
• Event showcase & concept section  
• Pricing / Soul Pass plans  
• Ticket quantity selection  
• QR based UPI payment  
• Email confirmation using EmailJS  
• Form validation (Name, Email, Phone)  
• Responsive mobile-first design  
• Animated gradients & effects  
• No backend required  

---

## Tech Stack

• HTML5  
• CSS3 (Modern design + animations)  
• JavaScript (Vanilla JS)  
• EmailJS (client-side emails)

---

## Project Structure

```
📁 project
 ├── index.html
 ├── style.css
 ├── script.js
 ├── img/
```

---

## How It Works

1. User selects a plan
2. Fills booking form
3. QR code payment appears
4. User confirms payment
5. EmailJS sends confirmation email automatically

---

## Email Setup (Important)

This project uses EmailJS for sending confirmation emails.

Steps:

1. Create account on https://www.emailjs.com/
2. Connect Gmail service
3. Create template
4. Replace credentials inside:

```
script.js
```

```
const EMAILJS_CONFIG = {
  publicKey: 'YOUR_KEY',
  serviceId: 'YOUR_SERVICE',
  templateId: 'YOUR_TEMPLATE'
};
```

---

## Screenshots

(Add your screenshots here later)

---

## Future Improvements

• Razorpay integration  
• SMS notifications  
• WhatsApp alerts  
• PDF tickets  
• Admin dashboard  
• Database storage  

---

## Author

Echoes Within Team

---

## License

Free for personal & educational use.
