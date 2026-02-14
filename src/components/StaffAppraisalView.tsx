import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { getStaffId } from '@/lib/staffUtils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { 
  ClipboardCheck, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle, 
  Star,
  ArrowLeft,
  Loader2
} from 'lucide-react';
import { formatDateIST } from '@/lib/dateUtils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const overallRatings: Record<string, { label: string; color: string }> = {
  excellent: { label: 'Excellent', color: 'bg-green-100 text-green-800' },
  good: { label: 'Good', color: 'bg-blue-100 text-blue-800' },
  satisfactory: { label: 'Satisfactory', color: 'bg-yellow-100 text-yellow-800' },
  needs_improvement: { label: 'Needs Improvement', color: 'bg-orange-100 text-orange-800' },
  poor: { label: 'Poor', color: 'bg-red-100 text-red-800' },
};

interface Appraisal {
  id: string;
  appraisal_date: string;
  appraisal_period_start: string;
  appraisal_period_end: string;
  overall_rating: string;
  punctuality_rating: number;
  work_quality_rating: number;
  teamwork_rating: number;
  communication_rating: number;
  professionalism_rating: number;
  patient_care_rating: number | null;
  infection_control_rating: number | null;
  documentation_rating: number | null;
  attendance_reliability_rating: number | null;
  initiative_rating: number | null;
  training_participation_rating: number | null;
  strengths: string | null;
  areas_for_improvement: string | null;
  manager_comments: string | null;
  action_plan: string | null;
  next_review_date: string | null;
  staff_acknowledgement: boolean | null;
  staff_comments: string | null;
  acknowledged_at: string | null;
}

interface StaffAppraisalViewProps {
  onBack: () => void;
}

const RatingBar: React.FC<{ label: string; value: number | null }> = ({ label, value }) => {
  if (value === null || value === undefined) return null;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold">{value}/5</span>
      </div>
      <Progress value={(value / 5) * 100} className="h-2" />
    </div>
  );
};

const StaffAppraisalView: React.FC<StaffAppraisalViewProps> = ({ onBack }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [appraisals, setAppraisals] = useState<Appraisal[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);

  useEffect(() => {
    fetchAppraisals();
  }, [user]);

  const fetchAppraisals = async () => {
    if (!user) return;
    try {
      const staffId = await getStaffId(user);
      if (!staffId) { setLoading(false); return; }

      const { data, error } = await supabase
        .from('staff_appraisals')
        .select('*')
        .eq('staff_id', staffId)
        .order('appraisal_date', { ascending: false });

      if (error) throw error;
      setAppraisals((data || []) as Appraisal[]);
    } catch (error) {
      console.error('Error fetching appraisals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async (appraisalId: string) => {
    setSubmitting(appraisalId);
    try {
      const comment = commentInputs[appraisalId] || null;
      const { error } = await supabase
        .from('staff_appraisals')
        .update({
          staff_acknowledgement: true,
          staff_comments: comment,
          acknowledged_at: new Date().toISOString(),
        } as any)
        .eq('id', appraisalId);

      if (error) throw error;

      toast({ title: 'Success', description: 'Appraisal acknowledged successfully' });
      fetchAppraisals();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to acknowledge appraisal', variant: 'destructive' });
    } finally {
      setSubmitting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-xl font-bold">My Appraisals</h2>
          <p className="text-sm text-muted-foreground">{appraisals.length} appraisal(s) on record</p>
        </div>
      </div>

      {appraisals.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <ClipboardCheck className="h-12 w-12 mx-auto text-muted-foreground mb-3 opacity-50" />
            <p className="text-muted-foreground">No appraisals found</p>
          </CardContent>
        </Card>
      ) : (
        appraisals.map((appraisal) => {
          const ratingInfo = overallRatings[appraisal.overall_rating] || { label: appraisal.overall_rating, color: '' };
          const isExpanded = expandedId === appraisal.id;

          return (
            <Collapsible key={appraisal.id} open={isExpanded} onOpenChange={() => setExpandedId(isExpanded ? null : appraisal.id)}>
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-base">
                          {formatDateIST(appraisal.appraisal_period_start)} – {formatDateIST(appraisal.appraisal_period_end)}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">
                          Appraised on {formatDateIST(appraisal.appraisal_date)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={ratingInfo.color}>{ratingInfo.label}</Badge>
                        {appraisal.staff_acknowledgement && (
                          <CheckCircle className="h-4 w-4 text-success" />
                        )}
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <CardContent className="pt-0 space-y-4">
                    {/* Core Ratings */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <Star className="h-4 w-4 text-primary" /> Core Performance
                      </h4>
                      <RatingBar label="Punctuality" value={appraisal.punctuality_rating} />
                      <RatingBar label="Work Quality" value={appraisal.work_quality_rating} />
                      <RatingBar label="Teamwork" value={appraisal.teamwork_rating} />
                      <RatingBar label="Communication" value={appraisal.communication_rating} />
                      <RatingBar label="Professionalism" value={appraisal.professionalism_rating} />
                    </div>

                    {/* Hospital-Specific Ratings */}
                    {(appraisal.patient_care_rating || appraisal.infection_control_rating || appraisal.documentation_rating || appraisal.attendance_reliability_rating || appraisal.initiative_rating || appraisal.training_participation_rating) && (
                      <div className="space-y-3 border-t pt-4">
                        <h4 className="text-sm font-semibold flex items-center gap-2">
                          <ClipboardCheck className="h-4 w-4 text-primary" /> Hospital-Specific
                        </h4>
                        <RatingBar label="Patient Care" value={appraisal.patient_care_rating} />
                        <RatingBar label="Infection Control" value={appraisal.infection_control_rating} />
                        <RatingBar label="Documentation" value={appraisal.documentation_rating} />
                        <RatingBar label="Attendance & Reliability" value={appraisal.attendance_reliability_rating} />
                        <RatingBar label="Initiative" value={appraisal.initiative_rating} />
                        <RatingBar label="Training Participation" value={appraisal.training_participation_rating} />
                      </div>
                    )}

                    {/* Feedback Sections */}
                    {appraisal.strengths && (
                      <div className="border-t pt-3">
                        <p className="text-sm font-semibold text-muted-foreground mb-1">Strengths</p>
                        <p className="text-sm">{appraisal.strengths}</p>
                      </div>
                    )}
                    {appraisal.areas_for_improvement && (
                      <div>
                        <p className="text-sm font-semibold text-muted-foreground mb-1">Areas for Improvement</p>
                        <p className="text-sm">{appraisal.areas_for_improvement}</p>
                      </div>
                    )}
                    {appraisal.action_plan && (
                      <div>
                        <p className="text-sm font-semibold text-muted-foreground mb-1">Action Plan</p>
                        <p className="text-sm">{appraisal.action_plan}</p>
                      </div>
                    )}
                    {appraisal.manager_comments && (
                      <div>
                        <p className="text-sm font-semibold text-muted-foreground mb-1">Manager Comments</p>
                        <p className="text-sm">{appraisal.manager_comments}</p>
                      </div>
                    )}

                    {/* Acknowledgement Section */}
                    {appraisal.staff_acknowledgement ? (
                      <div className="border-t pt-3 bg-success/5 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-success mb-1">
                          <CheckCircle className="h-4 w-4" />
                          <span className="text-sm font-semibold">Acknowledged</span>
                          {appraisal.acknowledged_at && (
                            <span className="text-xs text-muted-foreground">on {formatDateIST(appraisal.acknowledged_at)}</span>
                          )}
                        </div>
                        {appraisal.staff_comments && (
                          <p className="text-sm mt-1">{appraisal.staff_comments}</p>
                        )}
                      </div>
                    ) : (
                      <div className="border-t pt-3 space-y-3">
                        <Textarea
                          placeholder="Add your comments or response (optional)..."
                          value={commentInputs[appraisal.id] || ''}
                          onChange={(e) => setCommentInputs(prev => ({ ...prev, [appraisal.id]: e.target.value }))}
                          rows={2}
                        />
                        <Button
                          className="w-full"
                          onClick={() => handleAcknowledge(appraisal.id)}
                          disabled={submitting === appraisal.id}
                        >
                          {submitting === appraisal.id ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <CheckCircle className="h-4 w-4 mr-2" />
                          )}
                          I have read this appraisal
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          );
        })
      )}
    </div>
  );
};

export default StaffAppraisalView;
