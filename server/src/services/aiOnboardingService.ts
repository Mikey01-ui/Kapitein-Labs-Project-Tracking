import fs from "fs";
import path from "path";
import { PDFParse } from "pdf-parse";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ProjectSummary {
  domain: string;
  objectives: string;
  technologies: string[];
  startingTrl: number;
  targetTrl: number;
  constraints: string;
  projectName?: string;
  projectDesc?: string;
}

const defaultSummary = (): ProjectSummary => ({
  domain: "General Research",
  objectives: "Not yet fully defined",
  technologies: [],
  startingTrl: 1,
  targetTrl: 4,
  constraints: "General operational limits"
});

// Helper: read uploaded file from local uploads/ directory
async function getUploadedFileContent(fileUrl: string): Promise<string> {
  try {
    const filename = path.basename(fileUrl);
    const filePath = path.join(process.cwd(), "uploads", filename);
    if (fs.existsSync(filePath)) {
      if (filename.toLowerCase().endsWith(".pdf")) {
        const dataBuffer = fs.readFileSync(filePath);
        const parser = new PDFParse({ data: dataBuffer });
        const parsed = await parser.getText();
        await parser.destroy();
        return parsed.text || "";
      }
      return fs.readFileSync(filePath, "utf-8");
    }
  } catch (error) {
    console.error("Failed to read uploaded file:", error);
  }
  return "";
}

// Anthropic Messages API caller
async function callAnthropic(systemPrompt: string, messages: any[]): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("Anthropic API key is not configured in environment variables.");
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 4000,
      system: systemPrompt,
      messages: messages,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Anthropic API Error:", errorText);
    throw new Error(`Anthropic API call failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as any;
  return data.content[0].text;
}

const CHAT_SYSTEM_PROMPT = `You are a premium AI Project Onboarding Assistant designed to help bootstrap engineering, software, and research projects and generate a structured Technology Readiness Level (TRL) roadmap.
In your initial greeting, you must explicitly state: "I'm here to help you with your new project setup".
CRITICAL GREETING STYLE: Keep your initial response extremely short, concise, and straight to the point. Say ONLY: "Hello! I'm here to help you with your new project setup. What project are we building?" or similar. Do NOT output any extra introductory explanation, analogies, analogies to aerospace/software, or marketing/fluff text (e.g., do NOT say "Whether you're building something cutting-edge... let's kick things off").

Your goal is to guide the user in describing their project, extracting core project metadata (Project Name, Description/Goal, Domain, Technologies, Starting TRL, Target TRL, Constraints).

GUIDELINES:
1. Be conversant and collaborative. Ask 1-2 clarifying questions per turn. Don't dump a list of questions all at once.
2. If the user uploads a file or context is provided, reference its contents and show that you understand the specs.
3. Be alert to classify the project into one of these domains:
   - "Fusion & Plasma Physics"
   - "Chemical Engineering & Catalysis"
   - "Biotechnology & Bio-reactors"
   - "Aerospace & Propulsion"
   - "Software & Systems Engineering"
   - "General Research"
4. Continue asking questions until you have gathered sufficient details about:
   - Project Name & Description
   - Target milestones or technology stack
   - Starting TRL and Target TRL (TRL 1-9)
   - Timelines, constraints, or allocated team members
5. CRITICAL: Once you have gathered sufficient info (typically after 3-5 user turns, or if the user explicitly asks to generate the plan, or if you feel you have enough parameters), you MUST explicitly end your reply with the EXACT phrase:
   "I have gotten enough info. I will start building the project milestones and TRL-aligned task roadmap."
   Along with this phrase, provide a brief summary of the project parameters you extracted.
6. When you output this completion phrase, the UI will allow the user to generate the plan. Do not output this phrase prematurely; ensure you have at least the basic name, description, and TRL goals.

Format your output in a clean, professional markdown style. Keep responses concise and engaging.`;

async function extractSummaryWithAI(
  messages: ChatMessage[],
  fileContext: string,
  latestReply: string
): Promise<ProjectSummary> {
  const systemPrompt = `Analyze the conversation history, the latest AI response, and any uploaded file context to extract project parameters.
Return a JSON object conforming exactly to this interface:
{
  "domain": "Fusion & Plasma Physics" | "Chemical Engineering & Catalysis" | "Biotechnology & Bio-reactors" | "Aerospace & Propulsion" | "Software & Systems Engineering" | "General Research",
  "objectives": string,
  "technologies": string[],
  "startingTrl": number (1-9),
  "targetTrl": number (1-9),
  "constraints": string,
  "projectName": string,
  "projectDesc": string
}
Return ONLY valid raw JSON. No markdown wrappers, no formatting, just the raw JSON object.`;

  const chatContent = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join("\n") + `\nASSISTANT: ${latestReply}`;
  const userPrompt = `File context: ${fileContext}\n\nChat History:\n${chatContent}`;

  try {
    const jsonText = await callAnthropic(systemPrompt, [{ role: "user", content: userPrompt }]);
    const cleanJson = jsonText.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleanJson);
    return {
      domain: parsed.domain || "General Research",
      objectives: parsed.objectives || "Not yet fully defined",
      technologies: Array.isArray(parsed.technologies) ? parsed.technologies : [],
      startingTrl: Number(parsed.startingTrl) || 1,
      targetTrl: Number(parsed.targetTrl) || 4,
      constraints: parsed.constraints || "",
      projectName: parsed.projectName || "Advanced Research Project",
      projectDesc: parsed.projectDesc || "Bootstrapped via AI onboarding."
    };
  } catch (error) {
    console.error("Failed to extract summary with AI:", error);
    return extractSummary(messages, []);
  }
}

const PLAN_SYSTEM_PROMPT = `You are an expert project manager and system architect. Your task is to generate a custom project plan (Milestones and Kanban Task Cards) tailored to the provided project parameters and chat history.

The output must be a valid JSON object conforming exactly to this structure:
{
  "milestones": [
    {
      "name": string (Concise milestone name, e.g. "M1: Requirements & Design"),
      "dueDateOffsetDays": number (Estimated number of days from start date to achieve this milestone),
      "notes": string (Description of deliverables for this milestone)
    }
  ],
  "cards": [
    {
      "title": string (Concise task title),
      "description": string (Detailed task description),
      "columnType": "todo" | "progress" | "review" | "done" (Default "todo"),
      "trlLevel": number | null (Technology Readiness Level 1-9 associated with this task, or null if it is a general task),
      "priority": "LOW" | "MEDIUM" | "HIGH" | "URGENT" (Default "MEDIUM"),
      "order": number (Sequence order integer)
    }
  ]
}

Ensure the plan has:
1. 3-5 milestones spaced reasonably (e.g. Day 15, Day 45, Day 90).
2. 8-15 task cards aligned to the Technology Readiness Levels (TRL) corresponding to the project's starting and target TRL levels.
3. Tasks specific to the project's technology stack and domain.
4. Return ONLY valid raw JSON. No explanation text, no markdown code block wrappers.`;

// Core Chatbot Handler (Asynchronous Anthropic LLM API call with Mock Fallback)
export async function handleChatTurn(
  messages: ChatMessage[],
  files: any[]
): Promise<{ reply: string; isComplete: boolean; summary: ProjectSummary }> {
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn("Anthropic key missing, using mock agent...");
    return handleChatTurnMock(messages, files);
  }

  try {
    // Read file contents if available
    let fileContext = "";
    if (files && files.length > 0) {
      for (const f of files) {
        const content = await getUploadedFileContent(f.url);
        if (content) {
          fileContext += `\n--- Reference File: ${f.name} ---\n${content}\n`;
        }
      }
    }

    const systemPrompt = `${CHAT_SYSTEM_PROMPT}\n\n${fileContext ? `Uploaded document context:\n${fileContext}` : ""}`;
    
    // Convert messages to Anthropic format (user/assistant roles only)
    const formattedMessages = messages.map(m => ({
      role: m.role === "user" ? "user" as const : "assistant" as const,
      content: m.content
    }));

    const reply = await callAnthropic(systemPrompt, formattedMessages);
    
    const isComplete = reply.toLowerCase().includes("gotten enough info") || 
                       reply.toLowerCase().includes("sufficient info") ||
                       reply.toLowerCase().includes("ready to generate") ||
                       messages.length >= 12;

    const summary = await extractSummaryWithAI(messages, fileContext, reply);

    return { reply, isComplete, summary };

  } catch (error) {
    console.error("Anthropic chat turn failed, falling back to mock:", error);
    return handleChatTurnMock(messages, files);
  }
}

// Custom Plan Generator (Asynchronous Anthropic LLM API call with Mock Fallback)
export async function generateProjectPlan(
  projectName: string,
  description: string,
  targetTrl: number,
  chatHistory: ChatMessage[],
  files: any[]
): Promise<{ milestones: any[]; cards: any[] }> {
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn("Anthropic key missing, using mock plan generator...");
    return generateProjectPlanMock(projectName, description, targetTrl, chatHistory, files);
  }

  try {
    let fileContext = "";
    if (files && files.length > 0) {
      for (const f of files) {
        const content = await getUploadedFileContent(f.url);
        if (content) {
          fileContext += `\n--- File: ${f.name} ---\n${content}\n`;
        }
      }
    }

    const chatContent = chatHistory.map(m => `${m.role.toUpperCase()}: ${m.content}`).join("\n");
    const userPrompt = `Project Name: ${projectName}\nDescription: ${description}\nTarget TRL: ${targetTrl}\n\nFile Context:\n${fileContext}\n\nChat History:\n${chatContent}`;

    const jsonText = await callAnthropic(PLAN_SYSTEM_PROMPT, [{ role: "user", content: userPrompt }]);
    const cleanJson = jsonText.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleanJson);
    return {
      milestones: Array.isArray(parsed.milestones) ? parsed.milestones : [],
      cards: Array.isArray(parsed.cards) ? parsed.cards : []
    };
  } catch (error) {
    console.error("AI Plan Generation failed, falling back to mock:", error);
    return generateProjectPlanMock(projectName, description, targetTrl, chatHistory, files);
  }
}


// ==========================================
// FALLBACK DETERMINISTIC SIMULATION HANDLERS
// ==========================================

function detectDomain(projectName: string, description: string, textContext: string): string {
  const combined = `${projectName} ${description} ${textContext}`.toLowerCase();
  
  if (combined.includes("plasma") || combined.includes("tokamak") || combined.includes("fusion") || combined.includes("magnetic") || combined.includes("stellarator")) {
    return "Fusion & Plasma Physics";
  }
  if (combined.includes("catalyst") || combined.includes("chemical") || combined.includes("reactor") || combined.includes("reaction") || combined.includes("synthesis")) {
    return "Chemical Engineering & Catalysis";
  }
  if (combined.includes("cell") || combined.includes("biotech") || combined.includes("enzyme") || combined.includes("bio") || combined.includes("culture")) {
    return "Biotechnology & Bio-reactors";
  }
  if (combined.includes("drone") || combined.includes("flight") || combined.includes("aerodynamic") || combined.includes("battery") || combined.includes("propulsion") || combined.includes("thruster")) {
    return "Aerospace & Propulsion";
  }
  if (combined.includes("software") || combined.includes("database") || combined.includes("portal") || combined.includes("api") || combined.includes("web") || combined.includes("app") || combined.includes("platform") || combined.includes("tracker") || combined.includes("tracking") || combined.includes("system")) {
    return "Software & Systems Engineering";
  }
  
  return "General Research";
}

function extractSummary(messages: ChatMessage[], files: string[]): ProjectSummary {
  const summary = defaultSummary();
  let combinedUserText = "";
  
  messages.forEach(msg => {
    if (msg.role === "user") {
      combinedUserText += " " + msg.content;
    }
  });

  summary.domain = detectDomain("", "", combinedUserText + " " + files.join(" "));

  const trlMatches = combinedUserText.match(/trl\s*(\d)/gi);
  if (trlMatches && trlMatches.length > 0) {
    const nums = trlMatches.map(m => {
      const match = m.match(/\d/);
      return match ? parseInt(match[0]) : 1;
    });
    summary.startingTrl = Math.min(...nums);
    if (nums.length > 1) {
      summary.targetTrl = Math.max(...nums);
    } else {
      summary.targetTrl = Math.min(summary.startingTrl + 3, 9);
    }
  }

  if (combinedUserText.toLowerCase().includes("goal") || combinedUserText.toLowerCase().includes("objective")) {
    const sentences = combinedUserText.split(/[.!?]/);
    const goalSentence = sentences.find(s => s.toLowerCase().includes("goal") || s.toLowerCase().includes("objective") || s.toLowerCase().includes("want to") || s.toLowerCase().includes("aim to"));
    if (goalSentence) {
      summary.objectives = goalSentence.trim();
    }
  } else if (messages.length > 0) {
    const firstUserMsg = messages.find(m => m.role === "user");
    if (firstUserMsg) {
      summary.objectives = firstUserMsg.content.slice(0, 120) + (firstUserMsg.content.length > 120 ? "..." : "");
    }
  }

  const techKeywords = [
    "co2", "hydrogen", "tokamak", "ansys", "python", "solidworks", "reactor", "catalyst", 
    "rf", "microwave", "sensor", "arduino", "fluid", "simulation", "platinum", "nickel", 
    "lithium", "drone", "carbon", "fem", "cfd", "cad", "react", "node", "postgres"
  ];
  techKeywords.forEach(kw => {
    if (combinedUserText.toLowerCase().includes(kw) && !summary.technologies.includes(kw)) {
      summary.technologies.push(kw.toUpperCase());
    }
  });

  if (combinedUserText.toLowerCase().includes("deadline") || combinedUserText.toLowerCase().includes("limit") || combinedUserText.toLowerCase().includes("budget") || combinedUserText.toLowerCase().includes("month")) {
    const sentences = combinedUserText.split(/[.!?]/);
    const limitSentence = sentences.find(s => s.toLowerCase().includes("deadline") || s.toLowerCase().includes("limit") || s.toLowerCase().includes("budget") || s.toLowerCase().includes("month") || s.toLowerCase().includes("week"));
    if (limitSentence) {
      summary.constraints = limitSentence.trim();
    }
  }

  let nameMatch = combinedUserText.match(/(?:project\s+)?name:\s*([^\n\r.]+)/i) || 
                  combinedUserText.match(/call\s+(?:it|the\s+project)\s+([^\n\r.]+)/i) ||
                  combinedUserText.match(/named\s+([^\n\r.]+)/i);
  
  if (nameMatch && nameMatch[1]) {
    summary.projectName = nameMatch[1].trim().replace(/^["']|["']$/g, '');
  } else {
    const domainNames: Record<string, string> = {
      "Fusion & Plasma Physics": "Plasma Physics Confinement Study",
      "Chemical Engineering & Catalysis": "Chemical Reactor & Catalyst Optimization",
      "Biotechnology & Bio-reactors": "Biotechnology Cell Growth System",
      "Aerospace & Propulsion": "Aerospace Propulsion & Flight Design",
      "Software & Systems Engineering": "Custom Software & Systems Portal"
    };
    summary.projectName = domainNames[summary.domain] || "Advanced Research Track";
  }

  let descMatch = combinedUserText.match(/(?:description|summary):\s*([^\n\r]+)/i);
  if (descMatch && descMatch[1]) {
    summary.projectDesc = descMatch[1].trim();
  } else if (summary.objectives && summary.objectives !== "Not yet fully defined") {
    summary.projectDesc = summary.objectives;
  } else if (messages.length > 0) {
    const firstUserMsg = messages.find(m => m.role === "user");
    if (firstUserMsg) {
      summary.projectDesc = firstUserMsg.content.slice(0, 120) + (firstUserMsg.content.length > 120 ? "..." : "");
    }
  } else {
    summary.projectDesc = "Bootstrapped via AI guided onboarding.";
  }

  return summary;
}

export function handleChatTurnMock(
  messages: ChatMessage[],
  files: any[]
): { reply: string; isComplete: boolean; summary: ProjectSummary } {
  const fileNames = files.map(f => f.name || f);
  const summary = extractSummary(messages, fileNames);
  const userMessages = messages.filter(m => m.role === "user");
  const step = userMessages.length;

  let reply = "";
  let isComplete = false;

  if (step === 0) {
    reply = `Hello! I am your AI Project Onboarding Assistant. I'm here to help you with your new project setup.\n\nLet's begin! Could you tell me:\n1. What would you like to **name** this project?\n2. A brief **description** or primary goal of the project?\n3. Any technologies or documents you'd like to reference?`;
    return { reply, isComplete, summary };
  }

  if (step === 1) {
    const fileNotice = files.length > 0 
      ? `I see you uploaded: ${fileNames.join(", ")}. I've scanned the documents and classified this as a **${summary.domain}** project.\n\n`
      : "";
    
    reply = `${fileNotice}Hello! I am your AI Project Onboarding Assistant. I'm here to help you with your new project setup.\n\nI've classified this as a **${summary.domain}** project.\n\nTo help customize your experience, could you tell me:\n1. What would you like to **name** this project?\n2. A brief **description** or primary goal of the project?\n3. Any specific technologies, frameworks, or documents you want to reference?`;
  }
  else if (step === 2) {
    if (summary.domain === "Fusion & Plasma Physics") {
      reply = `Fascinating! Developing fusion or plasma systems requires rigorous validation. What are your specific plans for plasma heating, confinement, or magnetic coil modeling (e.g., using tokamaks, stellarators, or RF sources)?`;
    } else if (summary.domain === "Chemical Engineering & Catalysis") {
      reply = `Excellent! Chemical process research is highly sensitive to reaction kinetics and material constraints. What operates as your primary catalyst (e.g., Nickel, Platinum, Zeolites) and what are your target operating temperatures/pressures?`;
    } else if (summary.domain === "Biotechnology & Bio-reactors") {
      reply = `Interesting! Bio-catalysis and cellular cultures require strict environment control. What type of cells or biological agents are you engineering, and what are the key assay indicators?`;
    } else if (summary.domain === "Aerospace & Propulsion") {
      reply = `Great! Propulsion and drone aeronautics involve complex structural and power challenges. What fuel source, thruster mechanism, or battery cells are you incorporating?`;
    } else if (summary.domain === "Software & Systems Engineering") {
      reply = `Understood! Creating software or portal architectures calls for modularity and scalability. What stack (e.g., Node.js, Python, React) and database systems are you targeting?`;
    } else {
      reply = `Got it! For this research project, what are the primary material constraints, modeling software (like CAD, SolidWorks, or ANSYS), or physical assays you plan to use?`;
    }
  }
  else if (step === 3) {
    reply = `Thank you. Now, let's align on readiness levels. What is the current starting Technology Readiness Level (TRL) of this research, and what target TRL do you want to achieve by the end of this project cycle? (e.g., TRL 1: Principles, TRL 3: Proof of Concept, TRL 4: Lab Validation, TRL 6: Prototype Demo).`;
  }
  else if (step === 4) {
    reply = `Perfect. Lastly, are there any specific timelines, weekly hour limits, key engineering constraints, or specific team members who will lead the experimental validation?`;
  }
  else {
    isComplete = true;
    reply = `I have gotten enough info. I will start building the project milestones and TRL-aligned task roadmap. Here is the summary:\n\n` +
      `*   **Project Name**: ${summary.projectName || "General Research Track"}\n` +
      `*   **Description**: ${summary.projectDesc || "No description provided."}\n` +
      `*   **Project Domain**: ${summary.domain}\n` +
      `*   **Objectives**: ${summary.objectives}\n` +
      `*   **Technologies**: ${summary.technologies.length > 0 ? summary.technologies.join(", ") : "General research methods"}\n` +
      `*   **TRL Level**: Starting at TRL ${summary.startingTrl}, targeting TRL ${summary.targetTrl}\n` +
      `*   **Constraints**: ${summary.constraints || "Standard guidelines"}\n\n` +
      `I'm ready to generate your customized milestones and TRL-specific Kanban tasks. Click **Generate Project Plan** below to review it!`;
  }

  return { reply, isComplete, summary };
}

function generateProjectPlanMock(
  projectName: string,
  description: string,
  targetTrl: number,
  chatHistory: ChatMessage[],
  files: any[]
): { milestones: any[]; cards: any[] } {
  const fileNames = files.map(f => f.name || f);
  let userMessagesText = chatHistory.filter(m => m.role === "user").map(m => m.content).join(" ");
  const domain = detectDomain(projectName, description, userMessagesText + " " + fileNames.join(" "));
  
  const milestones: any[] = [];
  const cards: any[] = [];

  const trl = targetTrl || 4;
  
  milestones.push({
    name: "M1: Literature Review & Mathematical Formulation",
    dueDateOffsetDays: 15,
    notes: "Review previous research publications, establish baseline formulas, and compile requirements spec."
  });

  if (trl >= 3) {
    milestones.push({
      name: "M2: Experimental Concept Validation",
      dueDateOffsetDays: 45,
      notes: "Assemble initial laboratory testing rig, execute critical verification tests, and log proof-of-concept indicators."
    });
  }

  if (trl >= 5) {
    milestones.push({
      name: "M3: Subsystem Prototyping in Simulated Env",
      dueDateOffsetDays: 90,
      notes: "Design and integrate full scale prototype system, run simulated environment validations, and complete safety audit."
    });
  }

  if (trl >= 7) {
    milestones.push({
      name: "M4: Operational Environment demonstration",
      dueDateOffsetDays: 150,
      notes: "Demonstrate system operations in an active test environment and get formal signoff."
    });
  }

  cards.push({
    title: "Project Repository Setup & Doc Templates",
    description: "Initialize git repository, configure linting, and set up documentation guidelines for the team.",
    columnType: "todo",
    trlLevel: null,
    priority: "HIGH",
    order: 1
  });

  cards.push({
    title: "Conduct Weekly Team Kickoff Sync",
    description: "Align roles, establish weekly reporting processes, and set up project boards.",
    columnType: "todo",
    trlLevel: null,
    priority: "MEDIUM",
    order: 2
  });

  for (let lvl = 1; lvl <= trl; lvl++) {
    const levelCards = getCardsForTtrlLevel(lvl, domain, userMessagesText);
    levelCards.forEach((c, idx) => {
      cards.push({
        title: c.title,
        description: c.description,
        columnType: "todo",
        trlLevel: lvl,
        priority: idx === 0 ? "HIGH" : "MEDIUM",
        order: idx + 3
      });
    });
  }

  return { milestones, cards };
}

function getCardsForTtrlLevel(lvl: number, domain: string, userText: string): { title: string; description: string }[] {
  const lowercaseText = userText.toLowerCase();
  
  if (domain === "Fusion & Plasma Physics") {
    switch (lvl) {
      case 1:
        return [
          { title: "Define Core Plasma Governing Equations", description: "Establish fluid model (MHD) or kinetic equations for boundary transport and wave interaction." },
          { title: "Review Tokamak/Stellarator Design Benchmarks", description: "Collect operational metrics from literature on limiter/divertor heating bounds." }
        ];
      case 2:
        return [
          { title: "Formulate Magnetic Field Profile Layout", description: "Draft initial coil dimensions and verify magnetic surface safety factor calculations." },
          { title: "Formulate RF/Microwave Heating Coupling Concept", description: "Design antenna waveguide coupling concept based on target resonant frequency." }
        ];
      case 3:
        return [
          { title: "Execute Base Numerical Fluid Simulation", description: "Verify plasma density profiles and thermal transport in 1D transport code (like ASTRA or similar)." },
          { title: "Laboratory Bench Validation of RF Amplifier Cores", description: "Log peak power and VSWR (Standing Wave Ratio) variables for RF driver tubes." }
        ];
      case 4:
        return [
          { title: "Execute Integrated Core Boundary Simulation", description: "Simulate full 3D magnetic field line geometry and divertor power deposition profiles." },
          { title: "Assemble Plasma Cell Testing Chamber", description: "Construct laboratory vacuum vessel, set up pressure gauge, and verify base vacuum limits." }
        ];
      case 5:
        return [
          { title: "Execute Full Diagnostics Calibration", description: "Install Langmuir probes, spectrometers, or interferometry sensors and calibrate readings." },
          { title: "Simulate Plasma Disruption and Run Safety Runoff", description: "Verify coil structural forces during sudden current decay (plasma disruption)." }
        ];
      default:
        return [
          { title: "Complete Reactor Qualification Demonstration", description: "Run continuous plasma discharge for target duration and generate operational reports." }
        ];
    }
  }

  if (domain === "Chemical Engineering & Catalysis") {
    const catalyst = lowercaseText.includes("nickel") ? "Nickel (Ni)" : (lowercaseText.includes("platinum") ? "Platinum (Pt)" : "target catalyst materials");
    switch (lvl) {
      case 1:
        return [
          { title: "Establish Reaction Kinetics Formulas", description: "Define activation energy limits, Arrhenius parameters, and theoretical conversion ratios." },
          { title: "Identify Catalyst Active Phase Candidates", description: "Review thermodynamic stability bounds for active metals and oxide support materials." }
        ];
      case 2:
        return [
          { title: "Formulate Reactor Chamber Thermal Layout", description: "Draft CAD configurations of feed heater, reactor bed, and product condenser." },
          { title: "Formulate Catalyst Loading & Activation Protocols", description: "Define gas reduction temperatures and flowrates for the active metals." }
        ];
      case 3:
        return [
          { title: "Execute Lab Scale Catalyst Loading Test", description: `Synthesize a small batch of ${catalyst} on support support and verify surface area using BET method.` },
          { title: "Measure Baseline Conversion at low flowrates", description: "Execute experimental runs in a micro-reactor and measure gas conversion via GC (Gas Chromatography)." }
        ];
      case 4:
        return [
          { title: "Assemble Laboratory Scale Fluidized/Fixed Bed Reactor", description: "Construct reactor rig, calibrate temperature controls, and verify pressure seal safety." },
          { title: "Log Catalyst Deactivation profile over 24H", description: "Conduct continuous operations and report carbon deposition or sintering rates." }
        ];
      case 5:
        return [
          { title: "Calibrate Mass & Energy Balances under simulation", description: "Utilize simulation data (like Aspen Plus) to validate heat recovery integration." },
          { title: "Execute High Pressure Safety Runoff tests", description: "Calibrate safety relief valves and verify containment limits under thermal load." }
        ];
      default:
        return [
          { title: "Execute Continuous Pilot Scale Operations", description: "Operate reactor system for over 100 hours, reporting selectivities and yields." }
        ];
    }
  }

  if (domain === "Biotechnology & Bio-reactors") {
    switch (lvl) {
      case 1:
        return [
          { title: "Establish Microbial/Cellular growth equations", description: "Define Monod kinetics, oxygen uptake rate coefficients, and nutrient yield bounds." },
          { title: "Review Cell line expression yields", description: "Compile target protein or metabolite baseline indicators from reference databases." }
        ];
      case 2:
        return [
          { title: "Formulate Bio-reactor Agitation and aeration layout", description: "Model gas transfer coefficient (kLa) and impeller shear stress limits." },
          { title: "Formulate Culture Medium feeding strategies", description: "Define batch/fed-batch nutrient feeding profiles." }
        ];
      case 3:
        return [
          { title: "Culture Small Scale Shake Flask Inoculums", description: "Verify viability, growth rate, and purity of the cell lines in incubator runs." },
          { title: "Run Base Chromatography yield assays", description: "Measure product purity and recovery efficiency from small cultures." }
        ];
      case 4:
        return [
          { title: "Assemble 2L Glass bioreactor vessel", description: "Calibrate DO (Dissolved Oxygen), pH, and temperature probes in sterilization runs." },
          { title: "Execute Batch Fermentation run & log kinetics", description: "Run cell culture for 72 hours, tracking biomass density and glucose decay." }
        ];
      default:
        return [
          { title: "Calibrate Automated feeding loops", description: "Program controller to feed nutrients dynamically based on pH or oxygen trends." }
        ];
    }
  }

  if (domain === "Aerospace & Propulsion") {
    switch (lvl) {
      case 1:
        return [
          { title: "Define Thruster/Motor Thrust equations", description: "Model specific impulse, gas expansion, and nozzle expansion geometry calculations." },
          { title: "Review Battery cell power-to-weight metrics", description: "Compile energy density, discharge curves, and cooling thresholds." }
        ];
      case 2:
        return [
          { title: "Formulate Aerodynamic Wing/Hull CAD layout", description: "Draft initial model files and verify lift/drag coefficient estimations." },
          { title: "Formulate Thruster propellant delivery schematics", description: "Design solenoid valve layouts and regulator control parameters." }
        ];
      case 3:
        return [
          { title: "Execute CFD Airflow simulation sweeps", description: "Model hull lift and turbulence structures in open source tools or ANSYS Fluent." },
          { title: "Static Thrust Bench validation", description: "Mount motor/thruster assembly to load cell, trigger power runs, and log thrust forces." }
        ];
      case 4:
        return [
          { title: "Assemble Flight/Propulsion Laboratory prototype", description: "Wire battery cells, speed controllers, and autopilot telemetry boards into structure." },
          { title: "Calibrate Flight controller sensors & gyros", description: "Verify IMU alignment, magnetic compass deviation, and telemetry range bounds." }
        ];
      default:
        return [
          { title: "Execute Free-flight operations inside test range", description: "Verify autopilot waypoint tracking and log landing/recovery metrics." }
        ];
    }
  }

  if (domain === "Software & Systems Engineering") {
    switch (lvl) {
      case 1:
        return [
          { title: "Map Software Architecture & Modules", description: "Define API contracts, data models, schema relationships, and interface boundaries." },
          { title: "Review Server latency and load constraints", description: "Compile scaling requirements, connection limits, and performance goals." }
        ];
      case 2:
        return [
          { title: "Design UI Figma Mockups & Wireframes", description: "Draft layout pages, color theme palettes, navigation flows, and components." },
          { title: "Define Database Schema DDL files", description: "Formulate tables, foreign keys, index strategies, and caching layers." }
        ];
      case 3:
        return [
          { title: "Build Backend API skeleton endpoints", description: "Establish server framework, routing files, auth checks, and base tests." },
          { title: "Build Frontend Page templates", description: "Develop base pages with layout grids, color themes, and dummy hooks." }
        ];
      case 4:
        return [
          { title: "Integrate APIs with Frontend Components", description: "Hook actual database calls, handle loading/error indicators, and verify state flows." },
          { title: "Write API Integration and unit tests", description: "Execute test suite, achieving >80% code coverage on core logic modules." }
        ];
      default:
        return [
          { title: "Deploy to staging environment & run load tests", description: "Configure CI/CD pipelines, monitor container resources, and verify build stability." }
        ];
    }
  }

  switch (lvl) {
    case 1:
      return [
        { title: "Define Basic Research Principles", description: "Document core mathematical equations, physics models, or theoretical laws." },
        { title: "Conduct Literature review search", description: "Compile key publications, reference values, and competing patents." }
      ];
    case 2:
      return [
        { title: "Formulate Design concept drawings", description: "Create CAD files, functional block layouts, or flow schematics." },
        { title: "Define Experimental test scope guidelines", description: "Specify validation markers, calibration standards, and critical inputs." }
      ];
    case 3:
      return [
        { title: "Assemble Bench Scale laboratory setup", description: "Procure and mount instrumentation, connect power supplies, and verify signal loops." },
        { title: "Log baseline measurement runs", description: "Record initial validation metrics and confirm instrumentation accuracy." }
      ];
    case 4:
      return [
        { title: "Execute Complete laboratory validation sweeps", description: "Operate testing apparatus through target variable ranges and log output metrics." },
        { title: "Compile Lab Validation report", description: "Compare results with literature standards and document deviations." }
      ];
    default:
      return [
        { title: "Execute Final System Performance verification", description: "Perform stress tests under operational conditions and summarize deliverables." }
      ];
  }
}
