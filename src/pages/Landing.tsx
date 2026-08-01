// inspired UI/UX improved version of your Landing.jsx
// Clean, premium, medical-grade design with enhanced layout, spacing, colors, and components.

import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Menu,
  X,
  Phone,
  MapPin,
  Clock,
  Shield,
  Users,
  Heart,
  Star,
  Stethoscope,
  Activity,
  ArrowRight,
  Loader2,
} from "lucide-react";
import westmedBanner from "@/assets/westmed-banner.png";
import westmedLogo from "@/assets/westmed-logo.png";
import { usePublicWebsiteSettings } from "@/hooks/useWebsiteSettings";
import { useIsMobile } from "@/hooks/use-mobile";
import { Capacitor } from '@capacitor/core';

const Landing = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const { data: settings, isLoading } = usePublicWebsiteSettings();
  const isMobile = useIsMobile();
  
  // Auto-redirect to auth page on mobile/webview/native app
  useEffect(() => {
    const isNativeApp = Capacitor.isNativePlatform();
    const isWebView = /wv|WebView/i.test(navigator.userAgent);
    
    if (isMobile || isNativeApp || isWebView) {
      navigate('/auth', { replace: true });
    }
  }, [isMobile, navigate]);

  const handleNavClick = () => setMobileMenuOpen(false);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Fallbacks
  const hospitalName = settings?.hospital_name || "WestMed Hospital";
  const logoUrl = settings?.logo_url || westmedLogo;
  const bannerUrl = settings?.banner_url || westmedBanner;
  const heroHeadline = settings?.hero_headline || "Advanced Care, Trusted Expertise";
  const heroTagline =
    settings?.hero_tagline ||
    "Leading the way with compassionate medical care, global standards, and clinical excellence.";
  const bookAppointmentText = settings?.book_appointment_text || "Book Appointment";
  const emergencyButtonText = settings?.emergency_button_text || "Emergency Contact";
  const emergencyContact = settings?.emergency_contact || "Coming Soon";
  const whyChooseUs = settings?.why_choose_us || [];

  return (
    <div className="min-h-screen bg-white text-foreground">
      {/* NAVBAR */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoUrl} alt={hospitalName} className="h-10 w-10" />
            <span className="text-xl font-bold text-primary whitespace-nowrap">{hospitalName}</span>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-8 text-[15px] font-medium">
            <a href="#home" className="hover:text-primary transition-colors">
              Home
            </a>
            <a href="#services" className="hover:text-primary transition-colors">
              Services
            </a>
            <a href="#clinical" className="hover:text-primary transition-colors">
              Clinical Excellence
            </a>
            <a href="#doctors" className="hover:text-primary transition-colors">
              Doctors
            </a>
            <a href="#contact" className="hover:text-primary transition-colors">
              Contact
            </a>
            <Button onClick={() => navigate("/auth")} className="rounded-full px-6">
              Login
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white px-4 pb-4 border-t animate-fade-in">
            {["home", "services", "clinical", "doctors", "contact"].map((s) => (
              <a
                key={s}
                href={`#${s}`}
                onClick={handleNavClick}
                className="block py-3 border-b text-[15px] hover:text-primary"
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </a>
            ))}
            <Button className="w-full rounded-full mt-3" onClick={() => navigate("/auth")}>
              Login
            </Button>
          </div>
        )}
      </nav>

      {/* HERO */}
      <section
        id="home"
        className="relative min-h-[95vh] flex items-center justify-center pt-20 sm:pt-24"
        style={{
          backgroundImage: `linear-gradient(90deg, rgba(0,124,145,0.75), rgba(0,163,181,0.6)), url(${bannerUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="text-center text-white px-4 max-w-3xl mx-auto animate-fade-in">
          {/* Floating Logo Card */}
          <div className="inline-block bg-white p-6 rounded-2xl shadow-xl mb-8">
            <img src={logoUrl} className="h-20 w-20" />
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight drop-shadow-lg">
            {heroHeadline}
          </h1>

          <p className="text-lg sm:text-xl mb-8 text-white/90 max-w-2xl mx-auto leading-relaxed">{heroTagline}</p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className="rounded-full text-lg px-10 py-6 shadow-md hover:shadow-lg"
            >
              {bookAppointmentText}
            </Button>

            <Button
              size="lg"
              variant="outline"
              className="rounded-full text-lg px-8 py-6 border-white text-white bg-white/10 backdrop-blur-sm hover:bg-white/20"
              asChild
            >
              <a href={`tel:${emergencyContact.replace(/\s/g, "")}`}>
                <Phone className="inline h-5 w-5 mr-2" />
                {emergencyButtonText}
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" className="py-24 bg-[#F5F9FA]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center mb-4">Our Services</h2>
          <p className="text-muted-foreground text-lg text-center max-w-2xl mx-auto mb-16">
            Comprehensive healthcare supported by advanced facilities and expert medical teams.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Emergency Care */}
            <ServiceCard
              icon={<Heart />}
              title="Emergency Care"
              desc={
                settings?.emergency_care_description ||
                "24/7 critical emergency care with expert teams and advanced infrastructure."
              }
            />

            {/* Specialist Care */}
            <ServiceCard
              icon={<Users />}
              title="Specialist Care"
              desc={
                settings?.specialist_care_description ||
                "Highly skilled specialists across cardiology, orthopedics, neurology and more."
              }
            />

            {/* Health Checkups */}
            <ServiceCard
              icon={<Shield />}
              title="Health Check-ups"
              desc={
                settings?.health_checkups_description ||
                "Preventive and executive health packages designed for early detection."
              }
            />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mt-20 text-center">
            <StatItem label="Years of Service" value={settings?.years_of_service || 25} />
            <StatItem label="Expert Doctors" value={settings?.expert_doctors || 150} />
            <StatItem label="Patients Served" value={settings?.patients_served || "50K+"} />
            <div>
              <div className="text-4xl font-bold text-primary flex items-center justify-center gap-1">
                <Star className="fill-primary" />
                {settings?.patient_rating || 4.9}
              </div>
              <div className="text-muted-foreground">Patient Rating</div>
            </div>
          </div>
        </div>
      </section>

      {/* CLINICAL EXCELLENCE */}
      <ClinicalExcellence />

      {/* DOCTORS SECTION */}
      <DoctorsSection />

      {/* CONTACT */}
      <ContactSection settings={settings} emergencyContact={emergencyContact} />

      {/* FOOTER */}
      <Footer logoUrl={logoUrl} hospitalName={hospitalName} />
    </div>
  );
};

/* ------------------------------------------------------- */
/* SUB-COMPONENTS                                           */
/* ------------------------------------------------------- */

const ServiceCard = ({ icon, title, desc }) => (
  <div className="bg-white rounded-2xl p-8 shadow-md hover:shadow-xl transition-all">
    <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-6 text-primary text-3xl">
      {icon}
    </div>
    <h3 className="text-xl font-semibold mb-3">{title}</h3>
    <p className="text-muted-foreground leading-relaxed">{desc}</p>
  </div>
);

const StatItem = ({ label, value }) => (
  <div>
    <div className="text-4xl font-bold text-primary mb-1">{value}+</div>
    <div className="text-muted-foreground">{label}</div>
  </div>
);

/* Clinical Excellence */
const ClinicalExcellence = () => (
  <section id="clinical" className="py-24 bg-white">
    <div className="max-w-7xl mx-auto px-4">
      <h2 className="text-4xl font-bold text-center mb-4">Centers of Clinical Excellence</h2>
      <p className="text-muted-foreground text-lg text-center max-w-2xl mx-auto mb-16">
        World-class departments delivering advanced treatments and trusted outcomes.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        <DeptCard title="Cardiology" icon={<Heart />} />
        <DeptCard title="Neurology" icon={<Activity />} />
        <DeptCard title="Orthopedics" icon={<Users />} />
        <DeptCard title="Gastroenterology" icon={<Stethoscope />} />
      </div>
    </div>
  </section>
);

const DeptCard = ({ title, icon }) => (
  <div className="relative group bg-[#F5F9FA] rounded-2xl p-10 shadow-sm hover:shadow-xl transition-all cursor-pointer">
    <div className="text-primary text-4xl mb-4">{icon}</div>
    <h3 className="text-xl font-semibold mb-2">{title}</h3>
    <p className="text-muted-foreground text-sm mb-3">Learn more</p>
    <ArrowRight className="h-5 w-5 text-primary opacity-0 group-hover:opacity-100 transition-all" />
  </div>
);

/* Doctors */
const DoctorsSection = () => (
  <section id="doctors" className="py-24 bg-[#F5F9FA]">
    <div className="max-w-7xl mx-auto px-4 text-center">
      <h2 className="text-4xl font-bold mb-4">Meet Our Specialists</h2>
      <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-16">
        Experienced, board-certified doctors committed to your well-being.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-10">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-2xl shadow-md p-8 hover:shadow-xl transition-all">
            <div className="w-32 h-32 rounded-full bg-primary/10 mx-auto mb-6"></div>
            <h3 className="font-semibold text-xl mb-1">Dr. Specialist {i}</h3>
            <p className="text-muted-foreground text-sm mb-3">Consultant Physician</p>
            <Button className="rounded-full px-6 py-2 text-sm">Book Appointment</Button>
          </div>
        ))}
      </div>
    </div>
  </section>
);

/* Contact */
const ContactSection = ({ settings, emergencyContact }) => (
  <section id="contact" className="py-24 bg-white">
    <div className="max-w-7xl mx-auto px-4">
      <h2 className="text-4xl font-bold text-center mb-4">Contact Us</h2>
      <p className="text-muted-foreground text-lg text-center mb-16">
        We’re here to assist you with all healthcare needs.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-10">
        {/* Phone */}
        <div className="text-center bg-[#F5F9FA] p-10 rounded-2xl shadow-sm">
          <Phone className="h-10 w-10 text-primary mx-auto mb-4" />
          <h3 className="font-semibold mb-2 text-lg">Phone</h3>
          <p className="text-muted-foreground mb-1">{settings?.phone || "Coming Soon"}</p>
          <p className="text-muted-foreground text-sm">Emergency: {emergencyContact}</p>
        </div>

        {/* Location */}
        <div className="text-center bg-[#F5F9FA] p-10 rounded-2xl shadow-sm">
          <MapPin className="h-10 w-10 text-primary mx-auto mb-4" />
          <h3 className="font-semibold mb-2 text-lg">Location</h3>
          <p className="text-muted-foreground text-sm">{settings?.location || "Details Coming Soon"}</p>
        </div>

        {/* Hours */}
        <div className="text-center bg-[#F5F9FA] p-10 rounded-2xl shadow-sm">
          <Clock className="h-10 w-10 text-primary mx-auto mb-4" />
          <h3 className="font-semibold mb-2 text-lg">Hours</h3>
          <p className="text-muted-foreground text-sm whitespace-pre-line">
            {settings?.operating_hours || "Coming Soon"}
          </p>
        </div>
      </div>
    </div>
  </section>
);

/* Footer */
const Footer = ({ logoUrl, hospitalName }) => (
  <footer className="bg-[#F5F9FA] border-t py-12 mt-12">
    <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
      <div className="flex items-center gap-3">
        <img src={logoUrl} className="h-10 w-10" />
        <span className="font-semibold text-lg">{hospitalName}</span>
      </div>

      <p className="text-muted-foreground text-sm text-center md:text-left">
        © 2025–2045 Sivakumaran Infotech, Villupuram. All rights reserved.
      </p>

      <div className="flex gap-6 text-sm">
        <a className="text-muted-foreground hover:text-primary" href="#">
          Privacy Policy
        </a>
        <a className="text-muted-foreground hover:text-primary" href="#">
          Terms of Service
        </a>
      </div>
    </div>
  </footer>
);

export default Landing;
