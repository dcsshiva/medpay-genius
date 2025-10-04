import { useState } from "react";
import { useWebsiteSettings, useUpdateWebsiteSettings, useUploadAsset, WhyChooseUsPoint } from "@/hooks/useWebsiteSettings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

export const WebsiteSettings = () => {
  const { data: settings, isLoading } = useWebsiteSettings();
  const updateSettings = useUpdateWebsiteSettings();
  const uploadAsset = useUploadAsset();

  const [formData, setFormData] = useState<any>({});

  // Initialize form data when settings load
  useState(() => {
    if (settings && Object.keys(formData).length === 0) {
      setFormData(settings);
    }
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleWhyChooseUsChange = (index: number, field: "title" | "description", value: string) => {
    const updated = [...(formData.why_choose_us || [])];
    updated[index] = { ...updated[index], [field]: value };
    handleInputChange("why_choose_us", updated);
  };

  const handleSave = async () => {
    await updateSettings.mutateAsync(formData);
  };

  const handleImageUpload = async (file: File, type: "logo" | "banner") => {
    if (file.size > (type === "logo" ? 5 : 10) * 1024 * 1024) {
      toast.error(`File size must be less than ${type === "logo" ? "5MB" : "10MB"}`);
      return;
    }

    const url = await uploadAsset.mutateAsync({ file, type });
    handleInputChange(`${type}_url`, url);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!settings) {
    return <div>No settings found</div>;
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Website Settings</h1>
        <p className="text-muted-foreground mt-2">Manage your landing page content and branding</p>
      </div>

      <Tabs defaultValue="contact" className="space-y-6">
        <TabsList className="grid grid-cols-4 lg:grid-cols-7 gap-2 h-auto">
          <TabsTrigger value="contact">Contact</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="about">About</TabsTrigger>
          <TabsTrigger value="hero">Hero</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="stats">Statistics</TabsTrigger>
          <TabsTrigger value="footer">Footer</TabsTrigger>
        </TabsList>

        {/* Contact Information */}
        <TabsContent value="contact" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
              <CardDescription>Update contact details displayed on the landing page</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={formData.phone || ""}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
              <div>
                <Label htmlFor="emergency_contact">Emergency Contact</Label>
                <Input
                  id="emergency_contact"
                  value={formData.emergency_contact || ""}
                  onChange={(e) => handleInputChange("emergency_contact", e.target.value)}
                  placeholder="911 or +1 (555) 999-8888"
                />
              </div>
              <div>
                <Label htmlFor="location">Location/Address</Label>
                <Textarea
                  id="location"
                  value={formData.location || ""}
                  onChange={(e) => handleInputChange("location", e.target.value)}
                  placeholder="123 Medical Center Drive..."
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="operating_hours">Operating Hours</Label>
                <Textarea
                  id="operating_hours"
                  value={formData.operating_hours || ""}
                  onChange={(e) => handleInputChange("operating_hours", e.target.value)}
                  placeholder="Monday - Friday: 8:00 AM - 8:00 PM..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Services */}
        <TabsContent value="services" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Services Descriptions</CardTitle>
              <CardDescription>Customize service descriptions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="emergency_care">Emergency Care Service</Label>
                <Textarea
                  id="emergency_care"
                  value={formData.emergency_care_description || ""}
                  onChange={(e) => handleInputChange("emergency_care_description", e.target.value)}
                  placeholder="24/7 emergency care..."
                  rows={4}
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {formData.emergency_care_description?.length || 0}/500
                </p>
              </div>
              <div>
                <Label htmlFor="specialist_care">Specialist Care</Label>
                <Textarea
                  id="specialist_care"
                  value={formData.specialist_care_description || ""}
                  onChange={(e) => handleInputChange("specialist_care_description", e.target.value)}
                  placeholder="Expert specialist care..."
                  rows={4}
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {formData.specialist_care_description?.length || 0}/500
                </p>
              </div>
              <div>
                <Label htmlFor="health_checkups">Health Check-ups</Label>
                <Textarea
                  id="health_checkups"
                  value={formData.health_checkups_description || ""}
                  onChange={(e) => handleInputChange("health_checkups_description", e.target.value)}
                  placeholder="Comprehensive health screening..."
                  rows={4}
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {formData.health_checkups_description?.length || 0}/500
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* About Section */}
        <TabsContent value="about" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>About WestMed Hospital</CardTitle>
              <CardDescription>Update about section content</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="about_p1">About Paragraph 1</Label>
                <Textarea
                  id="about_p1"
                  value={formData.about_paragraph_1 || ""}
                  onChange={(e) => handleInputChange("about_paragraph_1", e.target.value)}
                  rows={4}
                  maxLength={1000}
                />
              </div>
              <div>
                <Label htmlFor="about_p2">About Paragraph 2</Label>
                <Textarea
                  id="about_p2"
                  value={formData.about_paragraph_2 || ""}
                  onChange={(e) => handleInputChange("about_paragraph_2", e.target.value)}
                  rows={4}
                  maxLength={1000}
                />
              </div>
              
              <div className="space-y-4 pt-4">
                <h3 className="font-semibold">Why Choose WestMed</h3>
                {(formData.why_choose_us || []).map((point: WhyChooseUsPoint, index: number) => (
                  <Card key={index}>
                    <CardContent className="pt-6 space-y-3">
                      <div>
                        <Label htmlFor={`why_title_${index}`}>Point {index + 1} - Title</Label>
                        <Input
                          id={`why_title_${index}`}
                          value={point.title}
                          onChange={(e) => handleWhyChooseUsChange(index, "title", e.target.value)}
                          maxLength={100}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`why_desc_${index}`}>Description</Label>
                        <Textarea
                          id={`why_desc_${index}`}
                          value={point.description}
                          onChange={(e) => handleWhyChooseUsChange(index, "description", e.target.value)}
                          rows={2}
                          maxLength={200}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Hero Section */}
        <TabsContent value="hero" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Hero Section</CardTitle>
              <CardDescription>Customize the main hero section</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="hero_headline">Main Headline</Label>
                <Input
                  id="hero_headline"
                  value={formData.hero_headline || ""}
                  onChange={(e) => handleInputChange("hero_headline", e.target.value)}
                  placeholder="Your Health, Our Priority"
                  maxLength={100}
                />
              </div>
              <div>
                <Label htmlFor="hero_tagline">Tagline/Subtitle</Label>
                <Textarea
                  id="hero_tagline"
                  value={formData.hero_tagline || ""}
                  onChange={(e) => handleInputChange("hero_tagline", e.target.value)}
                  placeholder="Providing exceptional healthcare..."
                  rows={3}
                  maxLength={300}
                />
              </div>
              <div>
                <Label htmlFor="book_appointment_text">Book Appointment Button Text</Label>
                <Input
                  id="book_appointment_text"
                  value={formData.book_appointment_text || ""}
                  onChange={(e) => handleInputChange("book_appointment_text", e.target.value)}
                  maxLength={50}
                />
              </div>
              <div>
                <Label htmlFor="emergency_button_text">Emergency Button Text</Label>
                <Input
                  id="emergency_button_text"
                  value={formData.emergency_button_text || ""}
                  onChange={(e) => handleInputChange("emergency_button_text", e.target.value)}
                  maxLength={50}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Branding */}
        <TabsContent value="branding" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Branding</CardTitle>
              <CardDescription>Update hospital name and images</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="hospital_name">Hospital Name</Label>
                <Input
                  id="hospital_name"
                  value={formData.hospital_name || ""}
                  onChange={(e) => handleInputChange("hospital_name", e.target.value)}
                  maxLength={100}
                />
              </div>

              <div>
                <Label>Hospital Logo</Label>
                <div className="mt-2 space-y-3">
                  {formData.logo_url && (
                    <div className="relative w-32 h-32 border rounded-lg overflow-hidden">
                      <img src={formData.logo_url} alt="Logo" className="w-full h-full object-contain" />
                    </div>
                  )}
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file, "logo");
                    }}
                  />
                  <p className="text-xs text-muted-foreground">Maximum size: 5MB. Formats: JPG, PNG, WEBP</p>
                </div>
              </div>

              <div>
                <Label>Banner Image</Label>
                <div className="mt-2 space-y-3">
                  {formData.banner_url && (
                    <div className="relative w-full h-48 border rounded-lg overflow-hidden">
                      <img src={formData.banner_url} alt="Banner" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file, "banner");
                    }}
                  />
                  <p className="text-xs text-muted-foreground">Maximum size: 10MB. Formats: JPG, PNG, WEBP</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Statistics */}
        <TabsContent value="stats" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Hospital Statistics</CardTitle>
              <CardDescription>Update the numbers displayed on the landing page</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="years_of_service">Years of Service</Label>
                <Input
                  id="years_of_service"
                  type="number"
                  value={formData.years_of_service || ""}
                  onChange={(e) => handleInputChange("years_of_service", parseInt(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="expert_doctors">Expert Doctors Count</Label>
                <Input
                  id="expert_doctors"
                  type="number"
                  value={formData.expert_doctors || ""}
                  onChange={(e) => handleInputChange("expert_doctors", parseInt(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="patients_served">Patients Served</Label>
                <Input
                  id="patients_served"
                  value={formData.patients_served || ""}
                  onChange={(e) => handleInputChange("patients_served", e.target.value)}
                  placeholder="50K+"
                />
              </div>
              <div>
                <Label htmlFor="patient_rating">Patient Rating</Label>
                <Input
                  id="patient_rating"
                  type="number"
                  step="0.1"
                  min="0"
                  max="5"
                  value={formData.patient_rating || ""}
                  onChange={(e) => handleInputChange("patient_rating", parseFloat(e.target.value))}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Footer */}
        <TabsContent value="footer" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Footer</CardTitle>
              <CardDescription>Customize footer content</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="copyright_text">Copyright Text</Label>
                <Input
                  id="copyright_text"
                  value={formData.copyright_text || ""}
                  onChange={(e) => handleInputChange("copyright_text", e.target.value)}
                  maxLength={200}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-4 mt-6">
        <Button variant="outline" onClick={() => setFormData(settings)}>
          Reset
        </Button>
        <Button onClick={handleSave} disabled={updateSettings.isPending}>
          {updateSettings.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
      </div>
    </div>
  );
};
