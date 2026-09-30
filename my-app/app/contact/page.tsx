import { MapPin, Phone, Clock, Mail } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { STORE_CONFIG } from "@/lib/storeConfig";

export default function ContactPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Contact Us</h1>
          <p className="text-xl text-gray-600">
            We&apos;d love to hear from you! Get in touch with us for any
            questions or feedback.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Contact Information */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MapPin className="h-5 w-5 mr-2 text-primary" />
                  Location
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700">
                  {STORE_CONFIG.address.street}
                  <br />
                  {STORE_CONFIG.address.city}, {STORE_CONFIG.address.province}{" "}
                  {STORE_CONFIG.address.postalCode}
                  <br />
                  {STORE_CONFIG.address.country}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Phone className="h-5 w-5 mr-2 text-primary" />
                  Phone
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700">
                  <a
                    href={`tel:${STORE_CONFIG.phone.href}`}
                    className="hover:text-primary transition-colors"
                  >
                    {STORE_CONFIG.phone.display}
                  </a>
                </p>
              </CardContent>
            </Card>

            {/* <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Mail className="h-5 w-5 mr-2 text-primary" />
                  Email
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700">
                  <a
                    href="mailto:info@gourmetexpress.com"
                    className="hover:text-primary transition-colors"
                  >
                    info@gourmetexpress.com
                  </a>
                </p>
              </CardContent>
            </Card> */}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="h-5 w-5 mr-2 text-primary" />
                  Hours
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-gray-700">
                  <div className="flex justify-between">
                    <span>Monday:</span>
                    <span>11:00 AM - 10:00 PM</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tuesday:</span>
                    <span>Closed</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Wednesday:</span>
                    <span>11:00 AM - 10:00 PM</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Thursday - Saturday:</span>
                    <span>11:00 AM - 11:00 PM</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sunday:</span>
                    <span>12:00 PM - 10:00 PM</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Map Placeholder */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Find Us</CardTitle>
                <CardDescription>
                  Located in the heart of Toronto, we&apos;re easily accessible
                  by car or public transit.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="aspect-video rounded-lg overflow-hidden">
                  <iframe
                    src={STORE_CONFIG.googleMapsEmbedUrl}
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen={true}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title={`${STORE_CONFIG.name} Location - ${STORE_CONFIG.address.formatted}`}
                    className="w-full h-full"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Get Directions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-gray-700">
                    <strong>By Car:</strong> Free parking available in our lot
                    behind the restaurant.
                  </p>
                  <p className="text-gray-700">
                    <strong>By TTC:</strong> Take the 45 Kipling bus to Kipling
                    Ave at Dixon Rd.
                  </p>
                  <p className="text-gray-700">
                    <strong>By Subway:</strong> Kipling Station (Line 2) + 10
                    minute bus ride.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Additional Information */}
        <div className="mt-12 text-center">
          <Card>
            <CardHeader>
              <CardTitle>Questions or Feedback?</CardTitle>
              <CardDescription>
                We value your input and are always looking to improve our
                service.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 mb-4">
                For immediate assistance with orders, please call us directly.
                For general inquiries, feedback, or catering requests, feel free
                to email us or visit us in person.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href={`tel:${STORE_CONFIG.phone.href}`}
                  className="inline-flex items-center px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Call Now
                </a>
                <a
                  href={`mailto:${STORE_CONFIG.email}`}
                  className="inline-flex items-center px-6 py-3 border border-primary text-primary rounded-lg hover:bg-primary hover:text-white transition-colors"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Email Us
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
