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

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    setMobileMenuOpen(false);
  };

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
            <div className="flex items-center gap-2 sm:gap-3">
              <img src={logoUrl} alt={hospitalName} className="h-8 w-8 sm:h-10 sm:w-10" />
              <span className="text-base sm:text-xl font-bold text-primary truncate max-w-[150px] sm:max-w-none">{hospitalName}</span>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-6 lg:gap-8">
              <a href="#home" className="text-foreground hover:text-primary transition-colors font-medium">Home</a>
              <a href="#services" className="text-foreground hover:text-primary transition-colors font-medium">Services</a>
              <a href="#about" className="text-foreground hover:text-primary transition-colors font-medium">About</a>
              <a href="#contact" className="text-foreground hover:text-primary transition-colors font-medium">Contact</a>
              <Button 
                onClick={() => navigate('/auth')}
                variant="default"
                className="ml-4 min-h-[44px]"
              >
                Login
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden pb-4 space-y-1 animate-fade-in">
              <a href="#home" onClick={handleNavClick} className="block py-3 px-2 text-foreground hover:text-primary hover:bg-muted/50 rounded transition-colors min-h-[44px] font-medium">Home</a>
              <a href="#services" onClick={handleNavClick} className="block py-3 px-2 text-foreground hover:text-primary hover:bg-muted/50 rounded transition-colors min-h-[44px] font-medium">Services</a>
              <a href="#about" onClick={handleNavClick} className="block py-3 px-2 text-foreground hover:text-primary hover:bg-muted/50 rounded transition-colors min-h-[44px] font-medium">About</a>
              <a href="#contact" onClick={handleNavClick} className="block py-3 px-2 text-foreground hover:text-primary hover:bg-muted/50 rounded transition-colors min-h-[44px] font-medium">Contact</a>
              <Button 
                onClick={() => navigate('/auth')}
                variant="default"
                className="w-full mt-2 min-h-[44px]"
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
          backgroundRepeat: 'no-repeat'
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white animate-fade-in">
          <div className="mb-6 sm:mb-8 inline-block">
            <div className="bg-white p-4 sm:p-6 rounded-full shadow-2xl animate-scale-in">
              <img src={logoUrl} alt={hospitalName} className="h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24" />
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 drop-shadow-lg leading-tight">
            {heroHeadline}
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl mb-6 sm:mb-8 text-white/90 drop-shadow-md max-w-3xl mx-auto leading-relaxed">
            {heroTagline}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-stretch sm:items-center max-w-2xl mx-auto">
            <Button 
              size="lg"
              onClick={() => navigate('/auth')}
              className="text-base sm:text-lg px-6 sm:px-8 min-h-[48px] sm:min-h-[52px] hover-scale"
            >
              {bookAppointmentText}
            </Button>
            <Button 
              size="lg"
              variant="outline"
              className="text-base sm:text-lg px-4 sm:px-6 min-h-[48px] sm:min-h-[52px] bg-white/10 backdrop-blur-sm border-white/30 text-white hover:bg-white/20 hover-scale"
              asChild
            >
              <a href={`tel:${emergencyContact.replace(/\s/g, '')}`} className="flex items-center justify-center">
                <Phone className="mr-2 h-5 w-5 flex-shrink-0" />
                <span className="truncate">{emergencyButtonText}</span>
              </a>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
            {/* Service Card 1 */}
            <div className="bg-card border rounded-lg p-6 sm:p-8 hover:shadow-lg transition-all duration-300 hover-scale h-full flex flex-col">
              <div className="bg-primary/10 w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mb-4 sm:mb-6">
                <Heart className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-3">Emergency Care</h3>
              <p className="text-muted-foreground text-sm sm:text-base flex-grow">
                {settings?.emergency_care_description || '24/7 emergency services with state-of-the-art facilities and experienced emergency medicine specialists'}
              </p>
            </div>

            {/* Service Card 2 */}
            <div className="bg-card border rounded-lg p-6 sm:p-8 hover:shadow-lg transition-all duration-300 hover-scale h-full flex flex-col">
              <div className="bg-primary/10 w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mb-4 sm:mb-6">
                <Users className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-3">Specialist Care</h3>
              <p className="text-muted-foreground text-sm sm:text-base flex-grow">
                {settings?.specialist_care_description || 'Expert doctors across multiple specialties including cardiology, neurology, orthopedics, and more'}
              </p>
            </div>

            {/* Service Card 3 */}
            <div className="bg-card border rounded-lg p-6 sm:p-8 hover:shadow-lg transition-all duration-300 hover-scale h-full flex flex-col sm:col-span-2 md:col-span-1">
              <div className="bg-primary/10 w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mb-4 sm:mb-6">
                <Shield className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-3">Health Check-ups</h3>
              <p className="text-muted-foreground text-sm sm:text-base flex-grow">
                {settings?.health_checkups_description || 'Comprehensive health screening packages for preventive care and early detection of health issues'}
              </p>
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 mt-12 sm:mt-16 pt-12 sm:pt-16 border-t">
            <div className="text-center p-4">
              <div className="text-3xl sm:text-4xl font-bold text-primary mb-2">{settings?.years_of_service || 25}+</div>
              <div className="text-muted-foreground text-sm sm:text-base">Years of Service</div>
            </div>
            <div className="text-center p-4">
              <div className="text-3xl sm:text-4xl font-bold text-primary mb-2">{settings?.expert_doctors || 150}+</div>
              <div className="text-muted-foreground text-sm sm:text-base">Expert Doctors</div>
            </div>
            <div className="text-center p-4">
              <div className="text-3xl sm:text-4xl font-bold text-primary mb-2">{settings?.patients_served || '50K+'}</div>
              <div className="text-muted-foreground text-sm sm:text-base">Patients Served</div>
            </div>
            <div className="text-center p-4">
              <div className="text-3xl sm:text-4xl font-bold text-primary mb-2 flex items-center justify-center gap-1">
                <Star className="inline h-6 w-6 sm:h-8 sm:w-8 fill-primary" />
                {settings?.patient_rating || 4.9}
              </div>
              <div className="text-muted-foreground text-sm sm:text-base">Patient Rating</div>
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            <div className="text-center p-6 hover:bg-muted/30 rounded-lg transition-colors">
              <div className="bg-primary/10 w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Phone className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
              </div>
              <h3 className="font-semibold mb-2 text-base sm:text-lg">Phone</h3>
              {settings?.phone && settings.phone !== 'Coming Soon' ? (
                <a href={`tel:${settings.phone.replace(/\s/g, '')}`} className="text-primary hover:underline block mb-1 min-h-[44px] flex items-center justify-center">
                  {settings.phone}
                </a>
              ) : (
                <p className="text-muted-foreground mb-1">{settings?.phone || 'Coming Soon'}</p>
              )}
              {emergencyContact && emergencyContact !== 'Coming Soon' ? (
                <a href={`tel:${emergencyContact.replace(/\s/g, '')}`} className="text-muted-foreground text-sm hover:text-primary hover:underline block min-h-[44px] flex items-center justify-center">
                  Emergency: {emergencyContact}
                </a>
              ) : (
                <p className="text-muted-foreground text-sm">Emergency: {emergencyContact}</p>
              )}
            </div>

            <div className="text-center p-6 hover:bg-muted/30 rounded-lg transition-colors">
              <div className="bg-primary/10 w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
              </div>
              <h3 className="font-semibold mb-2 text-base sm:text-lg">Location</h3>
              <p className="text-muted-foreground text-sm sm:text-base">{settings?.location || 'Details Coming Soon'}</p>
            </div>

            <div className="text-center p-6 hover:bg-muted/30 rounded-lg transition-colors">
              <div className="bg-primary/10 w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
              </div>
              <h3 className="font-semibold mb-2 text-base sm:text-lg">Hours</h3>
              <p className="text-muted-foreground whitespace-pre-line text-sm sm:text-base">{settings?.operating_hours || 'Coming Soon'}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-muted/50 border-t py-8 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <img src={logoUrl} alt={hospitalName} className="h-8 w-8 sm:h-10 sm:w-10" />
              <span className="font-semibold text-sm sm:text-base">{hospitalName}</span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground text-center order-last md:order-none">
              {settings?.copyright_text || `© ${new Date().getFullYear()} ${hospitalName}. All rights reserved.`}
            </p>
            <div className="flex gap-4 sm:gap-6">
              <a href="#" className="text-xs sm:text-sm text-muted-foreground hover:text-primary transition-colors min-h-[44px] flex items-center">Privacy Policy</a>
              <a href="#" className="text-xs sm:text-sm text-muted-foreground hover:text-primary transition-colors min-h-[44px] flex items-center">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
