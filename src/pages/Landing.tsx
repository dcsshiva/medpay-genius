import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Menu, X, Phone, MapPin, Clock, Shield, Users, Heart, Star, Loader2 } from 'lucide-react';
import westmedBanner from '@/assets/westmed-banner.png';
import westmedLogo from '@/assets/westmed-logo.png';
import { useWebsiteSettings } from '@/hooks/useWebsiteSettings';

const Landing = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const { data: settings, isLoading } = useWebsiteSettings();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Use settings with fallbacks
  const hospitalName = settings?.hospital_name || 'WestMed Hospital';
  const logoUrl = settings?.logo_url || westmedLogo;
  const bannerUrl = settings?.banner_url || westmedBanner;
  const heroHeadline = settings?.hero_headline || 'World-Class Healthcare to All';
  const heroTagline = settings?.hero_tagline || 'Providing comprehensive medical services with excellence, compassion, and innovation';
  const bookAppointmentText = settings?.book_appointment_text || 'Book Appointment';
  const emergencyButtonText = settings?.emergency_button_text || 'Emergency Contact';
  const emergencyContact = settings?.emergency_contact || 'Coming Soon';
  const whyChooseUs = settings?.why_choose_us || [];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <img src={logoUrl} alt={hospitalName} className="h-10 w-10" />
              <span className="text-xl font-bold text-primary">{hospitalName}</span>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#home" className="text-foreground hover:text-primary transition-colors">Home</a>
              <a href="#services" className="text-foreground hover:text-primary transition-colors">Services</a>
              <a href="#about" className="text-foreground hover:text-primary transition-colors">About</a>
              <a href="#contact" className="text-foreground hover:text-primary transition-colors">Contact</a>
              <Button 
                onClick={() => navigate('/auth')}
                variant="default"
                className="ml-4"
              >
                Login
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden pb-4 space-y-2">
              <a href="#home" className="block py-2 text-foreground hover:text-primary transition-colors">Home</a>
              <a href="#services" className="block py-2 text-foreground hover:text-primary transition-colors">Services</a>
              <a href="#about" className="block py-2 text-foreground hover:text-primary transition-colors">About</a>
              <a href="#contact" className="block py-2 text-foreground hover:text-primary transition-colors">Contact</a>
              <Button 
                onClick={() => navigate('/auth')}
                variant="default"
                className="w-full mt-2"
              >
                Login
              </Button>
            </div>
          )}
        </div>
      </nav>

      <section 
        id="home"
        className="relative min-h-screen flex items-center justify-center pt-16"
        style={{
          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url(${bannerUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed'
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
          <div className="mb-8 inline-block">
            <div className="bg-white p-6 rounded-full shadow-2xl">
              <img src={logoUrl} alt={hospitalName} className="h-24 w-24" />
            </div>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 drop-shadow-lg">
            {heroHeadline}
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-white/90 drop-shadow-md max-w-3xl mx-auto">
            {heroTagline}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg"
              onClick={() => navigate('/auth')}
              className="text-lg px-8"
            >
              {bookAppointmentText}
            </Button>
            <Button 
              size="lg"
              variant="outline"
              className="text-lg px-8 bg-white/10 backdrop-blur-sm border-white/30 text-white hover:bg-white/20"
            >
              <Phone className="mr-2 h-5 w-5" />
              {emergencyButtonText}: {emergencyContact}
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="services" className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Our Services</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Comprehensive healthcare services delivered by our team of expert medical professionals
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Service Card 1 */}
            <div className="bg-card border rounded-lg p-8 hover:shadow-lg transition-shadow">
              <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-6">
                <Heart className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Emergency Care</h3>
              <p className="text-muted-foreground">
                {settings?.emergency_care_description || '24/7 emergency services with state-of-the-art facilities and experienced emergency medicine specialists'}
              </p>
            </div>

            {/* Service Card 2 */}
            <div className="bg-card border rounded-lg p-8 hover:shadow-lg transition-shadow">
              <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-6">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Specialist Care</h3>
              <p className="text-muted-foreground">
                {settings?.specialist_care_description || 'Expert doctors across multiple specialties including cardiology, neurology, orthopedics, and more'}
              </p>
            </div>

            {/* Service Card 3 */}
            <div className="bg-card border rounded-lg p-8 hover:shadow-lg transition-shadow">
              <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-6">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Health Check-ups</h3>
              <p className="text-muted-foreground">
                {settings?.health_checkups_description || 'Comprehensive health screening packages for preventive care and early detection of health issues'}
              </p>
            </div>
          </div>

          {/* Statistics */}
          <div className="grid md:grid-cols-4 gap-8 mt-16 pt-16 border-t">
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">{settings?.years_of_service || 25}+</div>
              <div className="text-muted-foreground">Years of Service</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">{settings?.expert_doctors || 150}+</div>
              <div className="text-muted-foreground">Expert Doctors</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">{settings?.patients_served || '50K+'}</div>
              <div className="text-muted-foreground">Patients Served</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">
                <Star className="inline h-8 w-8 fill-primary" />
                {settings?.patient_rating || 4.9}
              </div>
              <div className="text-muted-foreground">Patient Rating</div>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">About {hospitalName}</h2>
              <p className="text-muted-foreground text-lg mb-4">
                {settings?.about_paragraph_1 || 'For over 25 years, WestMed Hospital has been at the forefront of providing exceptional healthcare services to our community.'}
              </p>
              <p className="text-muted-foreground text-lg mb-6">
                {settings?.about_paragraph_2 || 'Our commitment to excellence, combined with cutting-edge medical technology and a compassionate approach to patient care, has made us a trusted name in healthcare.'}
              </p>
              <Button 
                onClick={() => navigate('/auth')}
                size="lg"
              >
                Get Started
              </Button>
            </div>
            <div className="bg-card border rounded-lg p-8">
              <h3 className="text-xl font-semibold mb-6">Why Choose {hospitalName}?</h3>
              <ul className="space-y-4">
                {whyChooseUs.length > 0 ? (
                  whyChooseUs.map((point, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <div className="bg-primary/10 p-2 rounded-full mt-1">
                        {index === 0 && <Shield className="h-4 w-4 text-primary" />}
                        {index === 1 && <Users className="h-4 w-4 text-primary" />}
                        {index === 2 && <Heart className="h-4 w-4 text-primary" />}
                      </div>
                      <div>
                        <div className="font-medium mb-1">{point.title}</div>
                        <div className="text-sm text-muted-foreground">{point.description}</div>
                      </div>
                    </li>
                  ))
                ) : (
                  <>
                    <li className="flex items-start gap-3">
                      <div className="bg-primary/10 p-2 rounded-full mt-1">
                        <Shield className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium mb-1">Accredited Excellence</div>
                        <div className="text-sm text-muted-foreground">Internationally recognized medical standards</div>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="bg-primary/10 p-2 rounded-full mt-1">
                        <Users className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium mb-1">Expert Team</div>
                        <div className="text-sm text-muted-foreground">Board-certified specialists in every field</div>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="bg-primary/10 p-2 rounded-full mt-1">
                        <Heart className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium mb-1">Patient-Centered Care</div>
                        <div className="text-sm text-muted-foreground">Your health and comfort are our priority</div>
                      </div>
                    </li>
                  </>
                )}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Contact Us</h2>
            <p className="text-muted-foreground text-lg">We're here to help you with all your healthcare needs</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Phone className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Phone</h3>
              <p className="text-muted-foreground">{settings?.phone || 'Coming Soon'}</p>
              <p className="text-muted-foreground text-sm">Emergency: {emergencyContact}</p>
            </div>

            <div className="text-center p-6">
              <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Location</h3>
              <p className="text-muted-foreground">{settings?.location || 'Details Coming Soon'}</p>
            </div>

            <div className="text-center p-6">
              <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Hours</h3>
              <p className="text-muted-foreground whitespace-pre-line">{settings?.operating_hours || 'Coming Soon'}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-muted/50 border-t py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <img src={logoUrl} alt={hospitalName} className="h-8 w-8" />
              <span className="font-semibold">{hospitalName}</span>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              {settings?.copyright_text || `© ${new Date().getFullYear()} ${hospitalName}. All rights reserved.`}
            </p>
            <div className="flex gap-6">
              <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Privacy Policy</a>
              <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
