/**
 * Privacy Policy and Terms, ported verbatim from privacy.php and
 * terms.php. Both pages are linked sitewide and indexed, and both are
 * the text customers agreed to, so the wording is not rewritten. Only em
 * dashes are normalised to house style.
 */

export type LegalBlock = { type: "p" | "li"; text: string };
export type LegalSection = { heading: string; items: LegalBlock[] };
export type LegalPage = { title: string; sections: LegalSection[] };

export const LEGAL_PAGES: Record<string, LegalPage> = {
  privacy: {
    title: "Privacy Policy",
    sections: [
      {
        heading: "",
        items: [
          {
            type: "p",
            text: 'Lowcountry Business Spotlight ("we," "us," or "our") operates the website at www.lowcountrybusinessspotlight.com (the "Site"). This Privacy Policy explains how we collect, use, disclose, and protect your information when you visit the Site or use our services.',
          },
        ],
      },
      {
        heading: "1. Information We Collect",
        items: [
          {
            type: "p",
            text: "<strong>Information you provide directly:</strong>",
          },
          {
            type: "li",
            text: "<strong>Account registration</strong>, Name, email address, phone number, and password.",
          },
          {
            type: "li",
            text: "<strong>Business listings</strong>, Business name, address, phone, email, website, description, photos, hours of operation, and social media links.",
          },
          {
            type: "li",
            text: "<strong>Contact forms and inquiries</strong>, Name, email, phone number, and message content.",
          },
          {
            type: "li",
            text: "<strong>Advertising reservations</strong>, Business information, contact details, and ad preferences.",
          },
          {
            type: "li",
            text: "<strong>Newsletter subscriptions</strong>, Email address.",
          },
          {
            type: "p",
            text: "<strong>Information collected automatically:</strong>",
          },
          {
            type: "li",
            text: "<strong>Usage data</strong>, Pages visited, time spent on pages, referring URLs, and browser type.",
          },
          {
            type: "li",
            text: "<strong>Analytics</strong>, We use Google Analytics (GA4) to understand how visitors use the Site. Google Analytics collects information such as IP address (anonymized), device type, and browsing behavior.",
          },
          {
            type: "li",
            text: "<strong>Cookies</strong>, We use essential cookies for session management and authentication. Third-party services (Google Analytics, Facebook Pixel, Google Tag Manager) may set additional cookies for analytics and advertising purposes.",
          },
        ],
      },
      {
        heading: "2. How We Use Your Information",
        items: [
          {
            type: "p",
            text: "We use the information we collect to:",
          },
          {
            type: "li",
            text: "Create and manage your account and business listings.",
          },
          {
            type: "li",
            text: "Display your business information in our online directory.",
          },
          {
            type: "li",
            text: "Process advertising reservations and deliver postcard campaigns.",
          },
          {
            type: "li",
            text: "Respond to inquiries and provide customer support.",
          },
          {
            type: "li",
            text: "Send newsletters and marketing communications (with your consent).",
          },
          {
            type: "li",
            text: "Improve the Site, analyze usage patterns, and develop new features.",
          },
          {
            type: "li",
            text: "Prevent fraud and ensure the security of our services.",
          },
        ],
      },
      {
        heading: "3. How We Share Your Information",
        items: [
          {
            type: "p",
            text: "<strong>Publicly displayed information:</strong> Business listing details (name, address, phone, email, website, photos, hours, description) are publicly visible in our directory. This is the core purpose of the service.",
          },
          {
            type: "p",
            text: "<strong>We may also share information with:</strong>",
          },
          {
            type: "li",
            text: "<strong>Service providers</strong>, Third parties that help us operate the Site (hosting, email delivery, payment processing, printing services).",
          },
          {
            type: "li",
            text: "<strong>Analytics providers</strong>, Google Analytics and Facebook for website analytics and advertising performance.",
          },
          {
            type: "li",
            text: "<strong>Legal requirements</strong>, When required by law, court order, or to protect our rights and safety.",
          },
          {
            type: "p",
            text: "We do <strong>not</strong> sell your personal information to third parties.",
          },
        ],
      },
      {
        heading: "4. SMS and Text Messaging",
        items: [
          {
            type: "p",
            text: "We may send SMS text messages to phone numbers you provide through web forms on the Site (such as advertising inquiries, directory signup, and contact forms) or through our chat widget. SMS communications are used primarily for promotional and marketing messages about our services, account updates, and customer service replies.",
          },
          {
            type: "li",
            text: "<strong>Opt-in is voluntary and explicit.</strong> You are only enrolled in SMS communications when you check the SMS consent box on a web form and submit it, or when you initiate contact through the chat widget and provide your phone number. Consent is not a condition of purchase.",
          },
          {
            type: "li",
            text: "<strong>Message frequency varies.</strong> You may receive promotional messages from time to time, plus account or inquiry-related replies as needed.",
          },
          {
            type: "li",
            text: "<strong>Message and data rates may apply</strong> from your wireless carrier.",
          },
          {
            type: "li",
            text: "<strong>To opt out</strong>, reply <strong>STOP</strong> to any text message from us. You will receive a confirmation message and no further texts. For help, reply <strong>HELP</strong> or contact us using the information below.",
          },
          {
            type: "li",
            text: "<strong>No third-party sharing.</strong> SMS opt-in consent and the phone numbers collected for SMS purposes are <strong>not</strong> shared, sold, or transferred to third parties or affiliates for their marketing purposes. This includes opt-in data captured from web forms, the chat widget, and any other source on the Site.",
          },
          {
            type: "p",
            text: "Information collected through web forms and the chat widget (name, email, phone number, message content) is processed and stored in our customer relationship management system, which is operated by LeadConnector (HighLevel) on our behalf. See LeadConnector's privacy policy at gohighlevel.com/privacy-policy.",
          },
        ],
      },
      {
        heading: "5. Cookies and Tracking Technologies",
        items: [
          {
            type: "p",
            text: "The Site uses the following tracking technologies:",
          },
          {
            type: "li",
            text: "<strong>Google Analytics (GA4)</strong>, Website usage analytics.",
          },
          {
            type: "li",
            text: "<strong>Google Tag Manager</strong>, Tag management for analytics and marketing tools.",
          },
          {
            type: "li",
            text: "<strong>Facebook/Meta Pixel</strong>, Advertising conversion tracking and audience building.",
          },
          {
            type: "li",
            text: "<strong>Session cookies</strong>, Required for login and form functionality.",
          },
          {
            type: "p",
            text: "You can control cookies through your browser settings. Disabling cookies may limit some functionality of the Site.",
          },
        ],
      },
      {
        heading: "6. Data Security",
        items: [
          {
            type: "p",
            text: "We take reasonable measures to protect your information, including:",
          },
          {
            type: "li",
            text: "Encrypted password storage (bcrypt hashing).",
          },
          {
            type: "li",
            text: "Secure session management with HTTP-only cookies.",
          },
          {
            type: "li",
            text: "CSRF protection on forms.",
          },
          {
            type: "li",
            text: "Prepared database statements to prevent SQL injection.",
          },
          {
            type: "p",
            text: "However, no method of transmission over the Internet is 100% secure. We cannot guarantee absolute security of your data.",
          },
        ],
      },
      {
        heading: "7. Your Rights and Choices",
        items: [
          {
            type: "p",
            text: "You have the right to:",
          },
          {
            type: "li",
            text: "<strong>Access</strong> your personal information through your account dashboard.",
          },
          {
            type: "li",
            text: "<strong>Update or correct</strong> your business listing and account information.",
          },
          {
            type: "li",
            text: "<strong>Delete your account</strong>, Contact us to request account deletion.",
          },
          {
            type: "li",
            text: "<strong>Unsubscribe</strong> from marketing emails at any time.",
          },
          {
            type: "li",
            text: "<strong>Opt out of analytics</strong>, Use browser settings or the Google Analytics opt-out browser add-on.",
          },
        ],
      },
      {
        heading: "8. Children's Privacy",
        items: [
          {
            type: "p",
            text: "The Site is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If we learn that we have collected such information, we will delete it promptly.",
          },
        ],
      },
      {
        heading: "9. Third-Party Links",
        items: [
          {
            type: "p",
            text: "The Site may contain links to third-party websites (business websites, social media profiles). We are not responsible for the privacy practices of these external sites. We encourage you to review their privacy policies.",
          },
        ],
      },
      {
        heading: "10. Data Retention",
        items: [
          {
            type: "p",
            text: "We retain your information for as long as your account is active or as needed to provide services. Business listing data remains in the directory until you request removal. We may retain certain information as required by law or for legitimate business purposes.",
          },
        ],
      },
      {
        heading: "11. Changes to This Policy",
        items: [
          {
            type: "p",
            text: "We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated date. Your continued use of the Site after changes constitutes acceptance of the revised policy.",
          },
        ],
      },
      {
        heading: "12. California Privacy Rights",
        items: [
          {
            type: "p",
            text: "If you are a California resident, you may have additional rights under the California Consumer Privacy Act (CCPA), including the right to know what personal information we collect and the right to request deletion. Contact us to exercise these rights.",
          },
        ],
      },
      {
        heading: "13. Contact Us",
        items: [
          {
            type: "p",
            text: "If you have questions about this Privacy Policy or your personal data, contact us at:",
          },
          {
            type: "p",
            text: 'Lowcountry Business Spotlight PO Box 357 Huger, SC 29450 Email: "> Phone: 854-946-4500',
          },
        ],
      },
    ],
  },
  terms: {
    title: "Terms and Conditions",
    sections: [
      {
        heading: "1. Acceptance of Terms",
        items: [
          {
            type: "p",
            text: 'By accessing or using the Lowcountry Business Spotlight website ("Site") at www.lowcountrybusinessspotlight.com, including our business directory, advertising services, and related tools, you agree to be bound by these Terms and Conditions. If you do not agree, please do not use the Site.',
          },
        ],
      },
      {
        heading: "2. Description of Services",
        items: [
          {
            type: "p",
            text: "Lowcountry Business Spotlight provides:",
          },
          {
            type: "li",
            text: "<strong>Online Business Directory</strong>, Free and paid business listings for local businesses in the Charleston, SC area.",
          },
          {
            type: "li",
            text: "<strong>Direct Mail Advertising</strong>, Postcard-based marketing campaigns mailed to households in the Lowcountry region.",
          },
          {
            type: "li",
            text: "<strong>Related Services</strong>, Ad design, campaign management, and digital marketing tools.",
          },
        ],
      },
      {
        heading: "3. User Accounts",
        items: [
          {
            type: "p",
            text: "To create a business listing, you must register for an account. You agree to:",
          },
          {
            type: "li",
            text: "Provide accurate and complete information during registration.",
          },
          {
            type: "li",
            text: "Keep your login credentials secure and confidential.",
          },
          {
            type: "li",
            text: "Notify us immediately of any unauthorized use of your account.",
          },
          {
            type: "li",
            text: "Be responsible for all activity under your account.",
          },
          {
            type: "p",
            text: "We reserve the right to suspend or terminate accounts that violate these terms.",
          },
        ],
      },
      {
        heading: "4. Business Listings",
        items: [
          {
            type: "p",
            text: "By submitting a business listing, you represent that:",
          },
          {
            type: "li",
            text: "You are authorized to represent the business being listed.",
          },
          {
            type: "li",
            text: "All information provided is accurate and not misleading.",
          },
          {
            type: "li",
            text: "Your listing does not contain illegal, defamatory, or offensive content.",
          },
          {
            type: "p",
            text: "We reserve the right to edit, remove, or refuse any listing at our sole discretion, with or without notice.",
          },
        ],
      },
      {
        heading: "5. Advertising Services",
        items: [
          {
            type: "p",
            text: "For businesses participating in our direct mail postcard campaigns:",
          },
          {
            type: "li",
            text: "Ad placement is subject to availability and our approval.",
          },
          {
            type: "li",
            text: "We provide exclusive category placement per postcard, no direct competitors on the same mailing.",
          },
          {
            type: "li",
            text: "Payment is due prior to the print deadline. Unpaid reservations may be released.",
          },
          {
            type: "li",
            text: "We offer free ad design, but the final design must be approved before printing.",
          },
          {
            type: "li",
            text: "Once a mailing is sent to print, cancellations and refunds are not available.",
          },
        ],
      },
      {
        heading: "6. SMS and Text Messaging Communications",
        items: [
          {
            type: "p",
            text: "The Site offers a chat widget powered by LeadConnector that may collect your phone number when you initiate a conversation. By providing your phone number through the chat widget, you expressly consent to receive SMS text messages from Lowcountry Business Spotlight related to your inquiry, advertising campaigns, account, or business listing.",
          },
          {
            type: "li",
            text: "SMS communications are not a condition of any purchase.",
          },
          {
            type: "li",
            text: "Message and data rates may apply. Message frequency varies.",
          },
          {
            type: "li",
            text: "You may opt out at any time by replying <strong>STOP</strong> to any text message. Reply <strong>HELP</strong> for assistance.",
          },
          {
            type: "li",
            text: "The chat widget is the only mechanism by which we collect SMS opt-in. Phone numbers entered into business listing forms or directory account profiles are for public listing display purposes only and do not constitute SMS opt-in.",
          },
          {
            type: "p",
            text: "For details on how we handle your data, see our Privacy Policy.",
          },
        ],
      },
      {
        heading: "7. Fees and Payment",
        items: [
          {
            type: "li",
            text: "Basic directory listings are free. Premium features may require a paid subscription.",
          },
          {
            type: "li",
            text: "Advertising fees are based on location, reach, and ad size as quoted at the time of reservation.",
          },
          {
            type: "li",
            text: "All prices are in US dollars. Fees are non-refundable once services have been rendered or materials sent to print.",
          },
        ],
      },
      {
        heading: "8. Intellectual Property",
        items: [
          {
            type: "p",
            text: "All content on this Site, including text, graphics, logos, images, and software, is the property of Lowcountry Business Spotlight or its content suppliers and is protected by copyright law.",
          },
          {
            type: "p",
            text: "By uploading content (logos, photos, descriptions), you grant us a non-exclusive, royalty-free license to use that content in connection with our services, including online display and printed materials.",
          },
        ],
      },
      {
        heading: "9. Prohibited Conduct",
        items: [
          {
            type: "p",
            text: "You agree not to:",
          },
          {
            type: "li",
            text: "Use the Site for any unlawful purpose.",
          },
          {
            type: "li",
            text: "Submit false, misleading, or fraudulent information.",
          },
          {
            type: "li",
            text: "Scrape, harvest, or collect data from the Site without permission.",
          },
          {
            type: "li",
            text: "Interfere with the security or functionality of the Site.",
          },
          {
            type: "li",
            text: "Impersonate another person or business.",
          },
        ],
      },
      {
        heading: "10. Disclaimer of Warranties",
        items: [
          {
            type: "p",
            text: 'The Site and all services are provided "as is" without warranties of any kind, either express or implied. We do not guarantee that the Site will be uninterrupted, error-free, or that any particular advertising campaign will achieve specific results.',
          },
        ],
      },
      {
        heading: "11. Limitation of Liability",
        items: [
          {
            type: "p",
            text: "To the fullest extent permitted by law, Lowcountry Business Spotlight shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Site or services, including loss of profits, data, or business opportunities.",
          },
        ],
      },
      {
        heading: "12. Indemnification",
        items: [
          {
            type: "p",
            text: "You agree to indemnify and hold harmless Lowcountry Business Spotlight, its owners, employees, and agents from any claims, losses, or damages arising from your use of the Site, violation of these terms, or infringement of any third-party rights.",
          },
        ],
      },
      {
        heading: "13. Changes to Terms",
        items: [
          {
            type: "p",
            text: "We may update these Terms at any time. Changes will be posted on this page with an updated date. Continued use of the Site after changes constitutes acceptance of the revised terms.",
          },
        ],
      },
      {
        heading: "14. Governing Law",
        items: [
          {
            type: "p",
            text: "These Terms are governed by the laws of the State of South Carolina. Any disputes shall be resolved in the courts of Charleston County, South Carolina.",
          },
        ],
      },
      {
        heading: "15. Contact Us",
        items: [
          {
            type: "p",
            text: "If you have questions about these Terms, contact us at:",
          },
          {
            type: "p",
            text: 'Lowcountry Business Spotlight PO Box 357 Huger, SC 29450 Email: "> Phone: 854-946-4500',
          },
        ],
      },
    ],
  },
};
