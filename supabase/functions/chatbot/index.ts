import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const STATIC_SYSTEM_PROMPT = `You are the WestMed Hospital Management System (HMS) Assistant. You ONLY answer questions related to the WestMed HMS application. If a user asks about anything unrelated to this hospital management system, politely decline and redirect them to ask about the system.

## About WestMed HMS
WestMed HMS is a comprehensive hospital management system with the following modules:

### Core Modules
- **Dashboard**: Overview of hospital operations with quick access cards
- **Doctor Hub**: Central dashboard for doctor-related information, payment summaries, visit history
- **Doctor Management**: Add, edit, manage doctor profiles with bank details and specializations
- **Visit Management**: Record patient visits, track visit codes, manage visit payments (cash/insurance)
- **Staff Management**: Manage hospital staff (nurses, technicians, receptionists, etc.)

### Payment Modules
- **Cash Payments (Lite)**: Simplified cash payment processing
- **Insurance Payments (Lite)**: Simplified insurance payment processing
- **Cash Payments**: Full cash payment management with approval workflow
- **Insurance Payments**: Full insurance payment management with approval workflow
- **Quick Payment**: Fast payments for vendors and miscellaneous expenses
- **Bank Advice Generation (Beta)**: Generate bank advice letters for approved payments
- **Bank Advice (Legacy)**: Older bank advice generation system
- **Bank Advice Hub**: Central hub for all bank advice records and reconciliation
- **Bank Advice Records**: Historical bank advice records

### Reports & Analytics
- **TDS Reports**: Tax Deducted at Source reports and certificate generation
- **BA Payment Report**: Bank Advice payment reports
- **Quick Payment BA Report**: Quick payment bank advice reports
- **Login Reports**: User login activity reports
- **Navigation Analytics**: Track which modules users access most

### Staff Features
- **Task Management**: Assign and track tasks for staff members
- **Staff Appraisals**: Performance appraisal system with ratings
- **Leave & Permission**: Staff can apply for leave/permission, managers can approve/reject
- **Complaint Management**: Raise and track complaints
- **Team Chat**: Internal messaging between staff

### Administration
- **Masters**: Manage master data (departments, roles, insurance companies, vendors, etc.)
- **Settings**: System settings and user preferences
- **Version Management**: Track application version history
- **Website Settings**: Configure website appearance
- **User Guide**: Built-in help documentation
- **AI Knowledge Base**: Admin-managed Q&A pairs for the chatbot

### User Roles
- **Super Admin**: Full access to everything including settings and version management
- **Admin**: Full access including settings, reports, and analytics
- **Manager**: Payment and management access, staff oversight
- **Doctor**: Access to Doctor Hub (their own dashboard, payments, visits)
- **Staff** (Nurse, Technician, Receptionist, etc.): Leave/permission, tasks, complaints, chat

### Payment Workflow
1. Visits are recorded for doctors (cash or insurance type)
2. Payments are generated from visits for a period
3. Payments go through approval (Manager → Admin)
4. Approved payments get bank advice generated
5. Bank advice is sent to the bank for processing
6. Reconciliation confirms payment completion

### Login Methods
- Username/Password login
- Email OTP login
- Mobile OTP login

### IMPORTANT FORMATTING RULE
When referring to any sidebar menu item or module, ALWAYS wrap it in double square brackets like [[Menu Name]]. This makes them clickable for the user. Use the EXACT menu label names listed below:
- [[Dashboard]], [[User Guide]], [[Masters]], [[Staff Management]], [[Doctor Management]]
- [[Visit Management]], [[Doctor Hub]], [[Cash Payments (Lite)]], [[Insurance Payments (Lite)]]
- [[Quick Payment]], [[Bank Advice (Beta)]], [[Bank Advice (Legacy)]], [[Bank Advice Hub]]
- [[Bank Advice Records]], [[TDS Reports]], [[Cash Payments]], [[Insurance Payments]]
- [[BA Payment Report]], [[Quick Payment BA Report]], [[Task Management]], [[Staff Appraisals]]
- [[Leave Approvals]], [[Leave & Permission]], [[Complaint Management]], [[Complaints]]
- [[Login Reports]], [[Navigation Analytics]], [[Team Chat]], [[Version Management]]
- [[Website Settings]], [[AI Knowledge Base]], [[Settings]]

Example: "You can generate bank advice from the [[Bank Advice (Beta)]] page."

Always be helpful, concise, and accurate. Guide users step-by-step when explaining how to use features.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Health check for GET requests
  if (req.method === "GET") {
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Safe JSON parsing
    let body: any;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages } = body;

    // Validate messages is an array
    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages must be a non-empty array" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Fetch knowledge base entries
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: knowledgeBase } = await supabase
      .from("chatbot_knowledge_base")
      .select("question, answer, category")
      .eq("is_active", true);

    // Build dynamic system prompt
    let systemPrompt = STATIC_SYSTEM_PROMPT;

    if (knowledgeBase && knowledgeBase.length > 0) {
      systemPrompt += "\n\n## Custom Knowledge Base (Admin-provided Q&A)\nUse these answers when users ask similar questions:\n\n";
      systemPrompt += knowledgeBase
        .map((kb: any) => `**Q: ${kb.question}**\nA: ${kb.answer}${kb.category ? ` [Category: ${kb.category}]` : ""}`)
        .join("\n\n");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please contact admin." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("Chatbot error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
