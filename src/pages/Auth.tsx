// Apollo-inspired premium UI/UX redesign for Auth.jsx
// Logic preserved exactly. Only structural, styling, and layout enhancements.

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  Mail,
  KeyRound,
  Loader2,
} from 'lucide-react';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { supabase } from '@/integrations/supabase/client';
import westmedBanner from '@/assets/westmed-banner.png';
import westmedLogo from '@/assets/westmed-logo.png';
import Footer from '@/components/Footer';

const Auth = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [useOTP, setUseOTP] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const { signInWithOTP, verifyOTP, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const checkUserTypeAndNavigate = async () => {
      if (user) {
        const { data: doctorData } = await supabase
          .from('doctors')
          .select('id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .limit(1);

        if (doctorData && doctorData.length > 0) {
          navigate('/dashboard?view=doctor');
        } else {
          navigate('/dashboard');
        }
      }
    };
    checkUserTypeAndNavigate();
  }, [user, navigate]);

  useEffect(() => {
    if (otpCode.length === 6 && otpSent && !loading) {
      handleVerifyOTP(new Event('submit'));
    }
  }, [otpCode]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const interval = setInterval(() => {
        setResendCooldown((prev) => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [resendCooldown]);

  const handleUnifiedLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw authError;
      if (!authData.user) throw new Error('Invalid credentials');

      const userId = authData.user.id;

      /* DOCTOR CHECK */
      const { data: doctorData } = await supabase
        .from('doctors')
        .select('id, doctor_code, full_name')
        .eq('user_id', userId)
        .single();

      if (doctorData) {
        await createSession(userId, 'doctor', doctorData.id, doctorData.doctor_code, doctorData.full_name, 'doctor');
        toast({ title: 'Welcome Doctor!', description: 'Successfully signed in.' });
        return;
      }

      /* STAFF CHECK */
      const { data: staffData } = await supabase
        .from('staff')
        .select('id, staff_code, full_name, role')
        .eq('user_id', userId)
        .single();

      if (staffData) {
        const { data: designation } = await supabase
          .from('user_designations')
          .select('designation')
          .eq('user_id', userId)
          .single();

        const userDesignation = designation?.designation || 'staff';
        const timeoutDuration = ['admin', 'manager'].includes(staffData.role)
          ? 300
          : 180;

        await createSession(
          userId,
          'staff',
          staffData.id,
          staffData.staff_code,
          staffData.full_name,
          staffData.role,
          timeoutDuration
        );

        if (
          userDesignation === 'manager' ||
          userDesignation === 'admin' ||
          staffData.role === 'manager' ||
          staffData.role === 'admin'
        ) {
          toast({ title: `Welcome ${userDesignation}!`, description: 'Successfully signed in.' });
          navigate('/dashboard?view=doctor-hub');
          return;
        }

        toast({ title: 'Welcome back!', description: 'Successfully signed in.' });
        return;
      }

      /* DESIGNATION-ONLY */
      const { data: designationOnly } = await supabase
        .from('user_designations')
        .select('designation')
        .eq('user_id', userId)
        .single();

      if (designationOnly) {
        await createSession(
          userId,
          'staff',
          userId,
          email,
          email,
          designationOnly.designation,
          300
        );

        toast({ title: 'Welcome!', description: 'Successfully signed in.' });
        return;
      }

      throw new Error('No profile found for this user');
    } catch (error) {
      toast({ variant: 'destructive', title: 'Login Failed', description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const createSession = async (
    userId,
    userType,
    originalId,
    username,
    fullName,
    role,
    timeout = 180
  ) => {
    const sessionToken = `session_${Date.now()}_${Math.random()}`;
    const refreshToken = `refresh_${Date.now()}_${Math.random()}`;
    const expiresAt = new Date(Date.now() + 86400000);

    await supabase.from('user_sessions').insert({
      user_id: userId,
      user_type: userType,
      original_id: originalId,
      session_token: sessionToken,
      refresh_token: refreshToken,
      username,
      full_name: fullName,
      role,
      expires_at: expiresAt.toISOString(),
      idle_timeout_seconds: timeout,
      last_activity_at: new Date().toISOString(),
      is_active: true,
    });

    window.sessionStorage.setItem('supabase_session_token', sessionToken);
  };

  const handleSendOTP = async () => {
    if (!email) {
      toast({ variant: 'destructive', title: 'Email Required', description: 'Enter your email first' });
      return;
    }

    setLoading(true);

    const { error } = await signInWithOTP(email);

    if (error) {
      toast({ variant: 'destructive', title: 'Failed to Send OTP', description: error.message });
    } else {
      setOtpSent(true);
      setResendCooldown(60);
      toast({ title: 'OTP Sent', description: `Code sent to ${email}` });
    }

    setLoading(false);
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (otpCode.length !== 6) {
      toast({ variant: 'destructive', title: 'Invalid OTP', description: 'Enter full 6 digits' });
      setLoading(false);
      return;
    }

    const { error } = await verifyOTP(email, otpCode);

    if (error) {
      toast({ variant: 'destructive', title: 'OTP Verification Failed', description: error.message });
      setLoading(false);
      return;
    }

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const userId = authUser.id;

        const { data: doctorData } = await supabase
          .from('doctors')
          .select('id, doctor_code, full_name')
          .eq('user_id', userId)
          .single();

        if (doctorData) {
          await createSession(userId, 'doctor', doctorData.id, doctorData.doctor_code, doctorData.full_name, 'doctor');
          return;
        }

        const { data: staffData } = await supabase
          .from('staff')
          .select('id, staff_code, full_name, role')
          .eq('user_id', userId)
          .single();

        if (staffData) {
          const { data: designation } = await supabase
            .from('user_designations')
            .select('designation')
            .eq('user_id', userId)
            .single();

          const userDesignation = designation?.designation || 'staff';
          const timeoutDuration = ['manager', 'admin'].includes(staffData.role) ? 300 : 180;

          await createSession(
            userId,
