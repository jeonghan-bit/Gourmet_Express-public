import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Accessibility, Phone, Mail, MapPin } from "lucide-react";
import { STORE_CONFIG } from "@/lib/storeConfig";

export default function AccessibilityPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <Accessibility className="h-12 w-12 text-primary mr-4" />
            <h1 className="text-4xl font-bold text-gray-900">Accessibility</h1>
          </div>
          <p className="text-xl text-gray-600">
            We are committed to providing an inclusive dining experience for all
            our guests.
          </p>
        </div>

        <div className="space-y-8">
          {/* Physical Accessibility */}
          <Card>
            <CardHeader>
              <CardTitle>Physical Accessibility</CardTitle>
              <CardDescription>
                Our restaurant is designed to be accessible to guests with
                mobility needs.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">
                    Entrance & Seating
                  </h3>
                  <ul className="space-y-2 text-gray-700">
                    <li>• Wheelchair accessible entrance</li>
                    <li>• Wide doorways throughout</li>
                    <li>• Accessible seating options</li>
                    <li>• Clear pathways between tables</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">
                    Facilities
                  </h3>
                  <ul className="space-y-2 text-gray-700">
                    <li>• Accessible restroom facilities</li>
                    <li>• Accessible parking spaces</li>
                    <li>• Ramp access from parking lot</li>
                    <li>• Lowered service counter options</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Digital Accessibility */}
          <Card>
            <CardHeader>
              <CardTitle>Digital Accessibility</CardTitle>
              <CardDescription>
                Our website and online ordering system are designed with
                accessibility in mind.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">
                    Website Features
                  </h3>
                  <ul className="space-y-2 text-gray-700">
                    <li>• Screen reader compatible</li>
                    <li>• Keyboard navigation support</li>
                    <li>• High contrast text</li>
                    <li>• Alternative text for images</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">
                    Online Ordering
                  </h3>
                  <ul className="space-y-2 text-gray-700">
                    <li>• Large, clear buttons</li>
                    <li>• Simple navigation</li>
                    <li>• Voice input support</li>
                    <li>• Multiple payment options</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dietary Accommodations */}
          <Card>
            <CardHeader>
              <CardTitle>Dietary Accommodations</CardTitle>
              <CardDescription>
                We accommodate various dietary needs and restrictions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">
                    Allergies & Restrictions
                  </h3>
                  <ul className="space-y-2 text-gray-700">
                    <li>• Detailed allergen information</li>
                    <li>• Gluten-free options available</li>
                    <li>• Vegetarian and vegan dishes</li>
                    <li>• Custom preparation upon request</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">
                    Special Needs
                  </h3>
                  <ul className="space-y-2 text-gray-700">
                    <li>• Texture-modified foods available</li>
                    <li>• Low-sodium options</li>
                    <li>• Portion size adjustments</li>
                    <li>• Detailed ingredient lists</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Communication Support */}
          <Card>
            <CardHeader>
              <CardTitle>Communication Support</CardTitle>
              <CardDescription>
                We provide multiple ways to communicate and place orders.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">
                    Ordering Options
                  </h3>
                  <ul className="space-y-2 text-gray-700">
                    <li>• Online ordering system</li>
                    <li>• Phone orders with patient staff</li>
                    <li>• In-person assistance available</li>
                    <li>• Written order forms if needed</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">
                    Staff Training
                  </h3>
                  <ul className="space-y-2 text-gray-700">
                    <li>• Disability awareness training</li>
                    <li>• Patient communication approach</li>
                    <li>• Assistance with menu reading</li>
                    <li>• Flexible service options</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Feedback & Improvements */}
          <Card>
            <CardHeader>
              <CardTitle>Feedback & Continuous Improvement</CardTitle>
              <CardDescription>
                We welcome feedback to help us improve our accessibility.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-gray-700">
                  We are committed to continuously improving our accessibility
                  features and services. If you have suggestions, concerns, or
                  need specific accommodations, please don&apos;t hesitate to
                  contact us.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3">
                    <Phone className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-semibold">Call Us</p>
                      <p className="text-sm text-gray-600">
                        {STORE_CONFIG.phone.display}
                      </p>
                    </div>
                  </div>
                  {/* <div className="flex items-center space-x-3">
                    <Mail className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-semibold">Email Us</p>
                      <p className="text-sm text-gray-600">
                        accessibility@gourmetexpress.com
                      </p>
                    </div>
                  </div> */}
                  <div className="flex items-center space-x-3">
                    <MapPin className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-semibold">Visit Us</p>
                      <p className="text-sm text-gray-600">
                        {STORE_CONFIG.address.street}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Legal Compliance */}
          <Card>
            <CardHeader>
              <CardTitle>Legal Compliance</CardTitle>
              <CardDescription>
                Our commitment to accessibility standards and regulations.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-gray-700">
                <p>
                  Gourmet Express is committed to compliance with the
                  Accessibility for Ontarians with Disabilities Act (AODA) and
                  the Integrated Accessibility Standards Regulation (IASR).
                </p>
                <p>
                  We strive to meet or exceed the Web Content Accessibility
                  Guidelines (WCAG) 2.1 Level AA standards for our digital
                  platforms.
                </p>
                <p>
                  If you experience any accessibility barriers or have
                  suggestions for improvement, please contact us. We will work
                  with you to address any concerns promptly.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
