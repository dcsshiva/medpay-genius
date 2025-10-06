-- Drop triggers if they exist (in case they were partially created)
DROP TRIGGER IF EXISTS trigger_mark_visits_as_processed ON public.payments;
DROP TRIGGER IF EXISTS trigger_unmark_visits_on_payment_change ON public.payments;

-- Create trigger to mark visits as processed after payment insert
CREATE TRIGGER trigger_mark_visits_as_processed
AFTER INSERT ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.mark_visits_as_processed();

-- Create trigger to unmark visits on payment update/delete
CREATE TRIGGER trigger_unmark_visits_on_payment_change
AFTER UPDATE OR DELETE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.unmark_visits_on_payment_change();