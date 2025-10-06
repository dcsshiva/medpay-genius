import { useState } from "react";
import { useUserGuideSettings, useUpdateUserGuideSettings, FAQItem } from "@/hooks/useUserGuideSettings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, Trash2 } from "lucide-react";

export const UserGuideSettingsTab = () => {
  const { data: settings, isLoading } = useUserGuideSettings();
  const updateSettings = useUpdateUserGuideSettings();

  const [formData, setFormData] = useState<any>({});

  useState(() => {
    if (settings && Object.keys(formData).length === 0) {
      setFormData({
        ...settings,
        faq_items: settings.faq_items || []
      });
    }
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleFAQChange = (index: number, field: "question" | "answer", value: string) => {
    const updated = [...(formData.faq_items || [])];
    updated[index] = { ...updated[index], [field]: value };
    handleInputChange("faq_items", updated);
  };

  const addFAQItem = () => {
    const updated = [...(formData.faq_items || []), { question: "", answer: "" }];
    handleInputChange("faq_items", updated);
  };

  const removeFAQItem = (index: number) => {
    const updated = formData.faq_items.filter((_: any, i: number) => i !== index);
    handleInputChange("faq_items", updated);
  };

  const handleSave = async () => {
    await updateSettings.mutateAsync(formData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!settings) {
    return <div>No user guide settings found</div>;
  }

  return (
    <div className="space-y-6">
      {/* Welcome Messages */}
      <Card>
        <CardHeader>
          <CardTitle>Role-Specific Welcome Messages</CardTitle>
          <CardDescription>Customize welcome messages for each user role</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="welcome_admin">Admin Welcome Message</Label>
            <Textarea
              id="welcome_admin"
              value={formData.welcome_message_admin || ""}
              onChange={(e) => handleInputChange("welcome_message_admin", e.target.value)}
              rows={3}
              maxLength={500}
            />
          </div>
          <div>
            <Label htmlFor="welcome_manager">Manager Welcome Message</Label>
            <Textarea
              id="welcome_manager"
              value={formData.welcome_message_manager || ""}
              onChange={(e) => handleInputChange("welcome_message_manager", e.target.value)}
              rows={3}
              maxLength={500}
            />
          </div>
          <div>
            <Label htmlFor="welcome_doctor">Doctor Welcome Message</Label>
            <Textarea
              id="welcome_doctor"
              value={formData.welcome_message_doctor || ""}
              onChange={(e) => handleInputChange("welcome_message_doctor", e.target.value)}
              rows={3}
              maxLength={500}
            />
          </div>
          <div>
            <Label htmlFor="welcome_staff">Staff Welcome Message</Label>
            <Textarea
              id="welcome_staff"
              value={formData.welcome_message_staff || ""}
              onChange={(e) => handleInputChange("welcome_message_staff", e.target.value)}
              rows={3}
              maxLength={500}
            />
          </div>
        </CardContent>
      </Card>

      {/* Help Desk Information */}
      <Card>
        <CardHeader>
          <CardTitle>Help Desk Contact Information</CardTitle>
          <CardDescription>Support contact details displayed in user guide</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="help_desk_contact">Help Desk Phone</Label>
            <Input
              id="help_desk_contact"
              value={formData.help_desk_contact || ""}
              onChange={(e) => handleInputChange("help_desk_contact", e.target.value)}
              placeholder="+91 1234567890"
            />
          </div>
          <div>
            <Label htmlFor="help_desk_email">Help Desk Email</Label>
            <Input
              id="help_desk_email"
              type="email"
              value={formData.help_desk_email || ""}
              onChange={(e) => handleInputChange("help_desk_email", e.target.value)}
              placeholder="support@hospital.com"
            />
          </div>
          <div>
            <Label htmlFor="help_desk_hours">Support Hours</Label>
            <Input
              id="help_desk_hours"
              value={formData.help_desk_hours || ""}
              onChange={(e) => handleInputChange("help_desk_hours", e.target.value)}
              placeholder="Mon-Sat: 9 AM - 6 PM"
            />
          </div>
        </CardContent>
      </Card>

      {/* Announcement */}
      <Card>
        <CardHeader>
          <CardTitle>User Guide Announcement</CardTitle>
          <CardDescription>Display an important announcement at the top of the user guide</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="show_announcement"
              checked={formData.show_announcement || false}
              onCheckedChange={(checked) => handleInputChange("show_announcement", checked)}
            />
            <Label htmlFor="show_announcement">Show Announcement</Label>
          </div>
          {formData.show_announcement && (
            <>
              <div>
                <Label htmlFor="announcement_text">Announcement Text</Label>
                <Textarea
                  id="announcement_text"
                  value={formData.announcement_text || ""}
                  onChange={(e) => handleInputChange("announcement_text", e.target.value)}
                  rows={3}
                  maxLength={300}
                />
              </div>
              <div>
                <Label htmlFor="announcement_type">Announcement Type</Label>
                <select
                  id="announcement_type"
                  className="w-full p-2 border rounded-md"
                  value={formData.announcement_type || "info"}
                  onChange={(e) => handleInputChange("announcement_type", e.target.value)}
                >
                  <option value="info">Info (Blue)</option>
                  <option value="warning">Warning (Yellow)</option>
                  <option value="error">Error (Red)</option>
                  <option value="success">Success (Green)</option>
                </select>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* FAQ Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>FAQ Management</CardTitle>
              <CardDescription>Add frequently asked questions and answers</CardDescription>
            </div>
            <Button onClick={addFAQItem} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add FAQ
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {(formData.faq_items || []).map((faq: FAQItem, index: number) => (
            <Card key={index} className="bg-muted">
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-start justify-between">
                  <h4 className="font-semibold">FAQ #{index + 1}</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFAQItem(index)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <div>
                  <Label htmlFor={`faq_question_${index}`}>Question</Label>
                  <Input
                    id={`faq_question_${index}`}
                    value={faq.question}
                    onChange={(e) => handleFAQChange(index, "question", e.target.value)}
                    maxLength={200}
                  />
                </div>
                <div>
                  <Label htmlFor={`faq_answer_${index}`}>Answer</Label>
                  <Textarea
                    id={`faq_answer_${index}`}
                    value={faq.answer}
                    onChange={(e) => handleFAQChange(index, "answer", e.target.value)}
                    rows={3}
                    maxLength={1000}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
          {(formData.faq_items || []).length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No FAQs added yet. Click "Add FAQ" to create one.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-4">
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
