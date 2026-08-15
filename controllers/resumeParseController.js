const mammoth = require("mammoth");
const { PDFParse } = require('pdf-parse');



exports.parsingController = async (req, res) => {

    const extractText = async (file) => {
        const { mimetype, buffer } = file;
        console.log(mimetype, buffer)
        if (mimetype === "application/pdf") {
            const data = await new PDFParse(new Uint8Array(buffer));
            const result = await data.getText();
            return result.text;
        }

        if (
            mimetype ===
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
            mimetype === "application/msword"
        ) {
            const result = await mammoth.extractRawText({ buffer });
            return result.value; // plain text from DOCX/DOC
        }

        throw new Error("Unsupported file type");
    };


    // ─── Helper: extract a section's raw text between headings ───────────────
    const extractSection = (text, sectionName) => {
        const regex = new RegExp(
            `(?:^|\\n)[ \\t]*${sectionName}[ \\t]*[:\\-]?[ \\t]*\\n([\\s\\S]*?)(?=\\n[ \\t]*(?:experience|work experience|professional experience|education|skills|technical skills|projects|awards?|certifications?|languages?|references?|summary|objective|achievements?|honors?|contact|volunteering|publications?|interests?)[ \\t]*[:\\-]?[ \\t]*\\n|$)`,
            "i"  // ← 'i' flag handles ALL CAPS, lowercase, Title Case
        );
        const match = text.match(regex);
        return match ? match[1].trim() : null;
    };


    const splitEducationBlocks = (raw) => {
        const lines = raw
            .split("\n")
            .map(l => l.trim())
            .filter(Boolean);

        const blocks = [];
        let current = [];

        const dateRegex =
            /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)?\s*(19|20)\d{2}.*?(19|20)\d{2}|present|current/i;

        for (const line of lines) {
            current.push(line);

            if (dateRegex.test(line)) {
                blocks.push(current.join("\n"));
                current = [];
            }
        }

        if (current.length) {
            blocks.push(current.join("\n"));
        }

        return blocks;
    };

    const splitExperienceBlocks = (raw) => {
        const lines = raw.split(/\n|\s+-\s+/).map(l => l.trim()).filter(Boolean);
        const blocks = [];
        let current = [];

        for (const line of lines) {
            // A new experience entry starts when we see a job title keyword
            // AND the line is short (not a description sentence)
            const isJobTitle =
                /\b(developer|engineer|Pharmacy Assistant|designer|manager|analyst|consultant|architect|lead|intern|specialist|coordinator|director|officer|executive|scientist|researcher|administrator|devops|fullstack|frontend|backend|mobile|senior|junior|associate|head|chief|vp|president|programmer|technician|advisor|staff|store keeper|provide|shop|store|suppliers|analysts)\b/i.test(line) &&
                line.split(" ").length <= 10 &&   // titles are short
                !/[.!?]$/.test(line);             // not a sentence

            const isNewEntry = isJobTitle && current.length > 0;

            if (isNewEntry) {
                blocks.push(current.join("\n"));
                current = [line];
            } else {
                current.push(line);
            }
        }

        if (current.length > 0) blocks.push(current.join("\n"));
        return blocks;
    };


    const splitProjectBlocks = (raw) => {
        const lines = raw.split("\n").map(l => l.trim()).filter(Boolean);
        const blocks = [];
        let current = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const nextLine = lines[i + 1] || "";

            // A new project starts when:
            // current line looks like a title (short, capitalized, no bullets)
            // AND next line is a bullet/description OR current block already has content
            const looksLikeTitle =
                /^[A-Z]/.test(line) &&
                !/^[•\-–→*▪◦]/.test(line) &&
                !/https?:\/\//i.test(line) &&
                !/[.!?]$/.test(line) &&
                line.split(" ").length <= 8;

            const isNewEntry = looksLikeTitle && current.length > 0;

            if (isNewEntry) {
                blocks.push(current.join("\n"));
                current = [line];
            } else {
                current.push(line);
            }
        }

        if (current.length > 0) blocks.push(current.join("\n"));
        return blocks;
    };

    const parseResumeText = (text) => {
        const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

        // --- Name ---
        const fullName = lines[0] || null;
        const nameParts = fullName ? fullName.trim().split(/\s+/) : [];
        const firstName = nameParts[0] || null;
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : null;

        // --- Email ---
        const emailMatch = text.match(
            /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i
        );

        const email = emailMatch?.[0] || null;


        // --- Phone ---
        const phoneMatch = text.match(/(\+?\d[\d\s\-().]{7,}\d)/);
        const phone = phoneMatch ? phoneMatch[0].trim() : null;

        // --- LinkedIn ---
        const linkedinMatch = text.match(/linkedin\.com\/in\/[a-zA-Z0-9_-]+/i);
        const linkedin = linkedinMatch ? `https://${linkedinMatch[0]}` : null;

        // --- Role ---
        const roleMatch = text.match(
            /^(.*?(Pharmacy Assistant|Pharmacist|developer|engineer|designer|manager|analyst|consultant|architect|lead|intern|specialist|coordinator|director|officer|executive|scientist|researcher|administrator|devops|fullstack|full stack|frontend|backend|data|cloud|mobile|web|software|programmer|coder|qa|tester|sdet|product|project|scrum|agile|technical|technology|it|support|helpdesk|security|cybersecurity|network|system|database|dba|machine learning|ml|ai|artificial intelligence|business|marketing|sales|finance|accountant|accounting|auditor|hr|human resources|recruiter|talent|operations|operator|procurement|supply chain|logistics|customer success|customer service|representative|advisor|agent|teacher|trainer|instructor|professor|lecturer|doctor|physician|nurse|pharmacist|therapist|lawyer|attorney|legal|paralegal|writer|editor|content|copywriter|journalist|seo|sem|ux|ui|graphic|creative|video|media|production|founder|co-founder|owner|entrepreneur|president|vice president|vp|chief|cto|ceo|cfo|coo|head of|principal|staff|associate|junior|senior|store keeper|Pharmacy assistent|rep|Medical Coder|IT Support|Adminstative|Customere service)[^\n]*)/im
        );

        const role = roleMatch
            ? roleMatch[0].trim().replace(/\s+(at|@)\s+.*/i, "")
            : null;


        // --- Country ---
        const countryList = [
            "india",'united arab emirates',"uae", "usa", "united states", "uk", "united kingdom", "canada", "australia",
            "germany", "france", "uae", "singapore", "new zealand", "pakistan",
            "bangladesh", "sri lanka", "nepal", "malaysia", "south africa", "ireland"
        ];
        const countryMatch = text.match(
            new RegExp(`\\b(${countryList.join("|")})\\b`, "i")
        );
        const country = countryMatch ? countryMatch[0].trim() : null;

// --- City ---
        const cities = [
            // UAE
            "Dubai",
            "Abu Dhabi",
            "Sharjah",
            "Ajman",
            "Al Ain",
            "Ras Al Khaimah",
            "Fujairah",
            "Umm Al Quwain",

            // Saudi Arabia
            "Riyadh",
            "Jeddah",
            "Mecca",
            "Medina",
            "Dammam",
            "Khobar",
            "Tabuk",

            // Qatar
            "Doha",
            "Al Rayyan",
            "Al Wakrah",

            // Oman
            "Muscat",
            "Salalah",
            "Sohar",
            "Nizwa",

            // Kuwait
            "Kuwait City",
            "Hawalli",

            // India
            "Bangalore",
            "Bengaluru",
            "Mumbai",
            "Delhi",
            "New Delhi",
            "Chennai",
            "Hyderabad",
            "Pune",
            "Kolkata",
            "Ahmedabad",
            "Kochi",
            "Coimbatore",
            "Jaipur",
            "Lucknow",
            "Noida",
            "Gurgaon",

            // USA
            "New York",
            "Los Angeles",
            "Chicago",
            "Houston",
            "Dallas",
            "San Francisco",
            "Seattle",
            "Boston",
            "Austin",

            // UK
            "London",
            "Manchester",
            "Birmingham",
            "Liverpool",
            "Leeds",
            "Glasgow",

            // Canada
            "Toronto",
            "Vancouver",
            "Montreal",
            "Calgary",
            "Ottawa",

            // Australia
            "Sydney",
            "Melbourne",
            "Brisbane",
            "Perth",
            "Adelaide",

            // Germany
            "Berlin",
            "Munich",
            "Hamburg",
            "Frankfurt",

            // France
            "Paris",
            "Lyon",
            "Marseille",

            // Singapore
            "Singapore"
        ];

        const city = cities.find(c =>
            text.toLowerCase().includes(c.toLowerCase())
        ) || null;

// --- Portfolio URL ---
        const portfolioMatch = text.match(
            /(?:portfolio|website|web|blog|github\.io)[:\s]*([https?:\/\/]?(?:www\.)?[a-zA-Z0-9\-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?)/i
        );
        const portfolioUrl = portfolioMatch ? portfolioMatch[1].trim() : null;

// --- Nationality ---
        const nationalityList = [
            "indian","india", "british", "canadian", "australian", "german", "french",
            "emirati", "singaporean", "pakistani", "bangladeshi", "sri lankan", "nepali",
            "malaysian", "south african", "irish", "new zealander"
        ];
        const nationalityMatch = text.match(
            new RegExp(`\\b(${nationalityList.join("|")})\\b`, "i")
        );
        const nationality = nationalityMatch ? nationalityMatch[0].trim() : null;

        // professional summary

        const professionalSummary =
            extractSection(text, "professional summary") ||
            extractSection(text, "career objective") ||
            extractSection(text, "objective") ||
            extractSection(text, "summary") ||
            extractSection(text, "about me") ||
            extractSection(text, "profile") ||
            null;

        const MONTHS =
            "jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december";
        const DATE_TOKEN = `(?:${MONTHS})\\.?\\s*['’]?\\d{2,4}|\\d{1,2}\\/\\d{4}|\\d{4}`;
        const DATE_RANGE_REGEX = new RegExp(
            `(${DATE_TOKEN})\\s*(?:-|–|—|to|until|through)\\s*(${DATE_TOKEN}|present|current|now|ongoing|till date|to date)`,
            "i"
        );

        // ─── Skills → array of strings ────────────────────────────────────────────
        const skillsRaw =
            extractSection(text, "technical skills") ||
            extractSection(text, "core competencies") ||
            extractSection(text, "skills") ||
            null;

        const SKILLS_WHITELIST = new Set([
            // ─── Programming Languages ───────────────────────────────────────────
            "javascript", "typescript", "python", "java", "c", "c++", "c#", "php",
            "ruby", "go", "golang", "rust", "swift", "kotlin", "scala", "r", "matlab",
            "perl", "bash", "shell", "powershell", "dart", "lua", "haskell", "elixir",

            // ─── Frontend ─────────────────────────────────────────────────────────
            "html", "html5", "css", "css3", "sass", "scss", "less", "bootstrap",
            "tailwind", "tailwind css", "material ui", "mui", "chakra ui", "ant design",
            "react", "react.js", "next.js", "angular", "vue", "vue.js", "svelte",
            "redux", "jquery", "webpack", "vite", "babel", "storybook",

            // ─── Backend ──────────────────────────────────────────────────────────
            "node.js", "express", "express.js", "nestjs", "django", "flask", "fastapi",
            "laravel", "spring", "spring boot", "asp.net", ".net", "rails",
            "ruby on rails", "symfony", "codeigniter", "strapi",

            // ─── Databases ────────────────────────────────────────────────────────
            "mongodb", "mysql", "postgresql", "sqlite", "oracle", "sql server",
            "redis", "firebase", "dynamodb", "cassandra", "elasticsearch", "supabase",
            "prisma", "mongoose", "sequelize", "typeorm", "sql", "nosql",

            // ─── DevOps & Cloud ───────────────────────────────────────────────────
            "docker", "kubernetes", "jenkins", "terraform", "ansible", "aws",
            "azure", "gcp", "google cloud", "linux", "nginx", "apache", "ci/cd",
            "github actions", "gitlab ci", "circleci", "heroku", "vercel", "netlify",

            // ─── APIs & Architecture ──────────────────────────────────────────────
            "rest api", "graphql", "soap", "websocket", "microservices",
            "serverless", "grpc", "api gateway",

            // ─── Mobile ───────────────────────────────────────────────────────────
            "react native", "flutter", "android", "ios", "xamarin", "ionic",
            "swift", "kotlin", "expo",

            // ─── AI / ML / Data ───────────────────────────────────────────────────
            "machine learning", "deep learning", "artificial intelligence",
            "natural language processing", "nlp", "computer vision", "tensorflow",
            "pytorch", "keras", "scikit-learn", "pandas", "numpy", "matplotlib",
            "power bi", "tableau", "data analysis", "data visualization",
            "data science", "big data", "hadoop", "spark", "etl",

            // ─── Testing ──────────────────────────────────────────────────────────
            "jest", "mocha", "cypress", "selenium", "playwright", "junit",
            "quality assurance", "automation testing", "manual testing",
            "unit testing", "integration testing", "postman",

            // ─── Version Control ──────────────────────────────────────────────────
            "git", "github", "gitlab", "bitbucket", "svn",

            // ─── Design ───────────────────────────────────────────────────────────
            "figma", "adobe xd", "photoshop", "illustrator", "indesign",
            "ui design", "ux design", "wireframing", "prototyping", "canva",
            "sketch", "zeplin", "invision", "adobe photoshop", "adobe illustrator",
            "graphic design", "web design", "mobile app design", "motion design",
            "video editing", "after effects", "premiere pro", "final cut pro",
            "3d modeling", "blender", "autocad", "solidworks",
            "web & mobile app design", "social media post design",
            "wireframe & prototype", "sass & less", "jquery & javascript",
            "video editing & motion design", "mern stack development",

            // ─── Project Management ───────────────────────────────────────────────
            "agile", "scrum", "kanban", "jira", "confluence", "trello", "asana",
            "project management", "product management", "risk management",
            "stakeholder management", "ms project",

            // ─── Marketing & SEO ──────────────────────────────────────────────────
            "seo", "sem", "google ads", "facebook ads", "social media marketing",
            "content marketing", "email marketing", "google analytics", "hubspot",
            "mailchimp", "digital marketing", "copywriting", "brand management",
            "affiliate marketing", "influencer marketing",

            // ─── Sales & Business ─────────────────────────────────────────────────
            "crm", "salesforce", "lead generation", "business analysis",
            "market research", "business development", "negotiation",
            "customer service", "customer success", "account management",
            "cold calling", "b2b sales", "b2c sales",

            // ─── Finance & Accounting ─────────────────────────────────────────────
            "accounting", "bookkeeping", "quickbooks", "financial analysis",
            "budgeting", "auditing", "taxation", "financial reporting",
            "accounts payable", "accounts receivable", "payroll",
            "tally", "tally accounting", "tally erp", "erp", "sap",
            "inventory management", "stock control", "data management",
            "supply chain", "logistics", "procurement",

            // ─── HR ───────────────────────────────────────────────────────────────
            "recruitment", "talent acquisition", "employee relations",
            "performance management", "onboarding", "hr management",
            "compensation and benefits", "workforce planning",

            // ─── Healthcare ───────────────────────────────────────────────────────
            "patient care", "clinical research", "medical coding",
            "electronic health records", "ehr", "nursing", "first aid",
            "medical billing", "pharmacy", "phlebotomy",

            // ─── Office & Productivity ────────────────────────────────────────────
            "microsoft office", "ms office", "excel", "word", "powerpoint",
            "google workspace", "google sheets", "google docs", "outlook",
            "data entry", "typing", "transcription",

            // ─── Soft Skills ──────────────────────────────────────────────────────
            "leadership", "communication", "problem solving", "teamwork",
            "critical thinking", "time management", "adaptability",
            "decision making", "creativity", "attention to detail",
            "multitasking", "collaboration", "presentation skills",
            "emotional intelligence", "conflict resolution",

            // ─── Networking ───────────────────────────────────────────────────────
            "networking", "tcp/ip", "dns", "vpn", "firewall", "cisco",
            "cybersecurity", "ethical hacking", "penetration testing",
            "information security", "network administration",

            // ─── Retail / Operations ──────────────────────────────────────────────
            "inventory management", "stock control", "data management",
            "safety procedures", "quality assurance", "operations management",
            "supply chain management", "vendor management", "warehouse management",

            // ─── Bootstrap / UI Frameworks ────────────────────────────────────────
            "bootstrap 5", "mui 5", "mui5",
        ]);

// ─── Canonical display names ───────────────────────────────────────────────
        const CANONICAL = {
            "javascript": "JavaScript", "typescript": "TypeScript",
            "python": "Python", "java": "Java", "c++": "C++", "c#": "C#",
            "php": "PHP", "react": "React", "react.js": "React",
            "next.js": "Next.js", "node.js": "Node.js", "express": "Express.js",
            "express.js": "Express.js", "mongodb": "MongoDB",
            "postgresql": "PostgreSQL", "tailwind": "Tailwind CSS",
            "tailwind css": "Tailwind CSS", "rest api": "REST API",
            "graphql": "GraphQL", "aws": "AWS", "gcp": "Google Cloud Platform",
            "ui design": "UI Design", "ux design": "UX Design",
            "figma": "Figma", "git": "Git", "github": "GitHub",
            "docker": "Docker", "kubernetes": "Kubernetes",
            "machine learning": "Machine Learning", "nlp": "NLP",
            "tally": "Tally", "tally accounting": "Tally Accounting",
            "seo": "SEO", "sem": "SEM", "crm": "CRM", "erp": "ERP",
            "html": "HTML", "html5": "HTML5", "css": "CSS", "css3": "CSS3",
            "sass & less": "Sass & Less", "bootstrap 5": "Bootstrap 5",
            "mui 5": "MUI 5", "jquery & javascript": "jQuery & JavaScript",
            "web & mobile app design": "Web & Mobile App Design",
            "wireframe & prototype": "Wireframe & Prototype",
            "graphic design": "Graphic Design",
            "video editing & motion design": "Video Editing & Motion Design",
            "social media post design": "Social Media Post Design",
            "mern stack development": "MERN Stack Development",
        };

        const LEVEL_MAP = {
            "beginner": 0, "basic": 0,
            "intermediate": 2, "skillful": 2,
            "proficient": 3, "experienced": 3, "advanced": 3, "professional": 3,
            "expert": 4, "native": 4,
        };

        const skills = skillsRaw
            ? skillsRaw
                .split(/[\n,|•·\/]/)
                .map(s => s.replace(/^[•\-–→*▪◦]\s*/, "").trim())
                .filter(s => s.length > 1)
                .flatMap(s => /\s{2,}/.test(s)
                    ? s.split(/\s{2,}/).map(c => c.trim()).filter(Boolean)
                    : [s]
                )
                .filter(s => s.length > 1 && s.length < 60)
                .map(s => {
                    const levelMatch = s.match(/\b(beginner|basic|intermediate|skillful|proficient|experienced|advanced|professional|expert|native)\b/i);
                    const level = levelMatch ? (LEVEL_MAP[levelMatch[1].toLowerCase()] ?? 2) : 2;
                    const skillName = s
                        .replace(/\b(beginner|basic|intermediate|skillful|proficient|experienced|advanced|professional|expert|native)\b/gi, "")
                        .replace(/[-:()\[\]]/g, "")
                        .trim();
                    return { skill: skillName, level };
                })

                // ─── Whitelist check — only keep known skills ──────────────────────
                .filter(s => SKILLS_WHITELIST.has(s.skill.toLowerCase()))

                // ─── Apply canonical display name ──────────────────────────────────
                .map(s => ({
                    skill: CANONICAL[s.skill.toLowerCase()] || s.skill,
                    level: s.level,
                }))

                .filter(s => s.skill.length > 1)
                .filter((item, index, self) =>
                    index === self.findIndex(s => s.skill.toLowerCase() === item.skill.toLowerCase())
                )
            : [];




        // ─── Education → array of objects ─────────────────────────────────────────

        const educationRaw =
            extractSection(text, "education") ||
            extractSection(text, "academic background") ||
            extractSection(text, "qualifications") ||
            null;
        console.log(educationRaw)
        const education = educationRaw
            ? splitEducationBlocks(educationRaw)
                .map((block) => {
                    const lines = block.split("\n").map(l => l.trim()).filter(Boolean);

                    const degreeRegex =
                        /\b(bachelor's|bachelor|master|phd|doctorate|b\.?sc|m\.?sc|mba|b\.?tech|m\.?tech|m\.?e|b\.?e|bcom|bca|bsc|ba|ma|mca|msc|associate|diploma|certificate|undergraduate|postgraduate|degree|course|internship)\b/i;

                    const schoolRegex =
                        /\b(university|college|institute|school|academy|polytechnic|institution)\b/i;

                    const fieldRegex =
                        /\b(computerScience|computer science|computer applications|information technology|software engineering|computer engineering|business administration|commerce|accounting|finance|economics|mechanical engineering|civil engineering|electrical engineering|electronics|data science|artificial intelligence|machine learning|cyber security|mern stack|full stack|web development)\b/i;

                    const dateRegex = /\b(19|20)\d{2}\b/;

                    // ─── Find each field by its own keyword ──────────────────────────
                    const degreeLine   = lines.find(l => degreeRegex.test(l));
                    const schoolLine   = lines.find(l => schoolRegex.test(l));
                    const fieldLine    = lines.find(l => fieldRegex.test(l));
                    const dateLine     = lines.find(l => dateRegex.test(l));

                    // ─── Date parsing ────────────────────────────────────────────────
                    let startDate = null;
                    let endDate   = null;

                    if (dateLine) {
                        const years      = dateLine.match(/\b(19|20)\d{2}\b/g) || [];
                        const hasPresent = /present|current|now/i.test(dateLine);
                        startDate = years[0] || null;
                        endDate   = years[1] || (hasPresent ? "Present" : null);
                    }

                    // ─── Fallback for school: line that is NOT degree/field/date ────
                    const usedLines = [degreeLine, schoolLine, fieldLine, dateLine].filter(Boolean);
                    const remainingLines = lines.filter(l => !usedLines.includes(l));

                    return {
                        school:       schoolLine       || remainingLines[0] || null,
                        degree:       degreeLine       || null,
                        fieldOfStudy: fieldLine        || null,
                        grade:        null,
                        startDate,
                        endDate,
                        country:      null,
                        city:         null,
                    };
                })
                .filter(e => e.degree || e.school)
            : [];

        // ─── Experience → array of objects ────────────────────────────────────────
        const experienceRaw =
            extractSection(text, "professional experience") ||
            extractSection(text, "work experience") ||
            extractSection(text, "exeperience") ||
            extractSection(text, "experience") ||
            extractSection(text, "work history") ||

            null;
        console.log(experienceRaw);

        const SINGLE_DATE_REGEX = new RegExp(`\\b(${DATE_TOKEN})\\b`, "i");


        const parseDates = (blockText) => {
            const rangeMatch = blockText.match(DATE_RANGE_REGEX);
            if (rangeMatch) {
                return { startDate: rangeMatch[1].trim(), endDate: rangeMatch[2].trim() };
            }
            const sinceMatch = blockText.match(SINCE_REGEX);
            if (sinceMatch) {
                return { startDate: sinceMatch[1].trim(), endDate: "Present" };
            }
            const singleMatch = blockText.match(SINGLE_DATE_REGEX);
            if (singleMatch) {
                return { startDate: singleMatch[1].trim(), endDate: null };
            }
            return { startDate: null, endDate: null };
        };

        const SINCE_REGEX = new RegExp(`\\bsince\\s+(${DATE_TOKEN})`, "i");

        const extractLocation = (lines, exclude = []) => {
            const locationLine = lines.find(
                (l) =>
                    /^[A-Za-z\s]+,\s*[A-Za-z\s]+/.test(l) &&
                    !exclude.includes(l) &&
                    !/\b(inc|ltd|llc|pvt|university|college|institute|hospital|tech|solutions)\b/i.test(l)
            );
            if (!locationLine) return { city: null, country: null };
            const parts = locationLine.replace(/\.$/, "").split(",").map((p) => p.trim()).filter(Boolean);
            return { city: parts[0] || null, country: parts[parts.length - 1] || null };
        };



        const isExperienceHeaderLine = (line) =>
            /\b(developer|engineer|designer|manager|analyst|consultant|architect|lead|intern|specialist|coordinator|director|officer|executive|scientist|researcher|administrator|technician|supervisor|assistant|accountant|nurse|teacher|driver|cashier|receptionist|clerk|operator|advisor|representative|agent|associate|senior|junior|head of|chief|founder)\b/i.test(
                line
            ) &&
            line.split(" ").length <= 12 &&
            !/[.!?]$/.test(line);

        const experience = experienceRaw
            ? splitExperienceBlocks(experienceRaw)
                .map((block) => {


                    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
                    const titleLine = lines.find(isExperienceHeaderLine);
                    const companyLine = lines.find(
                        (l) =>
                            /\b(inc|ltd|llc|pvt|solutions|technologies|tech|systems|group|services|consulting|studio|labs|agency|software|digital|global|clinic|hospital|school|college|university|institute|center|centre|trading|enterprises|holdings|corp|corporation)\b/i.test(l) &&
                            l !== titleLine
                    );
                    const dateLine = lines.find((l) => DATE_RANGE_REGEX.test(l) || SINCE_REGEX.test(l));
                    const { startDate, endDate } = parseDates(block);
                    const { city, country } = extractLocation(lines, [titleLine, companyLine, dateLine].filter(Boolean));

                    const responsibilities = lines
                        .filter(
                            (l) =>
                                /^[•\-–→*▪◦]\s*/.test(l) ||
                                (l !== titleLine &&
                                    l !== companyLine &&
                                    l !== dateLine &&
                                    l.split(" ").length > 5) // long descriptive line = likely a bullet with formatting stripped
                        )
                        .map((l) => l.replace(/^[•\-–→*▪◦]\s*/, "").trim());

                    const usedLines = [titleLine, companyLine, dateLine].filter(Boolean);
                    const remaining = lines.filter((l) => !usedLines.includes(l));

                    return {
                        jobTitle: titleLine || remaining[0] || null,
                        employer: companyLine || remaining[1] || null,
                        startDate,
                        endDate,
                        city,
                        country,
                        responsibilities,
                    };

                })
                .filter((e) => e.jobTitle || e.employer)
            : [];

        // ─── Projects → array of objects ──────────────────────────────────────────
        const projectsRaw =
            extractSection(text, "projects") ||
            extractSection(text, "personal projects") ||
            extractSection(text, "key projects") ||
            null;
        console.log(projectsRaw)

        const projects = projectsRaw
            ? splitProjectBlocks(projectsRaw)
                .map((block) => {
                    const lines = block
                        .split("\n")
                        .map((l) => l.trim())
                        .filter(Boolean);

                    // ─── URL detection ────────────────────────────────────────────────
                    const urlLine = lines.find((l) =>
                        /https?:\/\/[^\s]+|www\.[^\s]+/i.test(l)
                    );
                    const githubLine = lines.find((l) =>
                        /github\.com\/[^\s]+/i.test(l)
                    );

                    const projectUrl = urlLine
                        ? (urlLine.match(/https?:\/\/[^\s]+|www\.[^\s]+/i) || [])[0]
                        : null;

                    const gitHubUrl = githubLine
                        ? (githubLine.match(/https?:\/\/github\.com\/[^\s]+|github\.com\/[^\s]+/i) || [])[0]
                        : null;

                    // ─── Key features: bullet lines ───────────────────────────────────
                    const keyFeatures = lines.filter((l) =>
                        /^[•\-–→*▪◦]\s+/.test(l) ||
                        /^(built|developed|implemented|integrated|designed|created|added|supports|features|allows|enables|includes)/i.test(l)
                    ).map((l) => l.replace(/^[•\-–→*▪◦]\s*/, "").trim());

                    // ─── Title: first non-bullet, non-url line ────────────────────────
                    const titleLine = lines.find((l) =>
                        !/^[•\-–→*▪◦]/.test(l) &&
                        !/https?:\/\//i.test(l) &&
                        !/github\.com/i.test(l)
                    );

                    return {
                        projectTitle: titleLine  || null,
                        keyFeatures,
                        projectUrl:   projectUrl || null,
                        gitHubUrl:    gitHubUrl  || null,
                    };
                })
                .filter((p) => p.projectTitle)
            : [];

        // ─── Awards → array of objects ────────────────────────────────────────────
        const awardsRaw = extractSection(text, "awards?|achievements?|honors?|certifications?");

        const awards = awardsRaw
            ? awardsRaw
                .split(/\n{2,}|\n(?=[A-Z•])/)
                .map((block) => {
                    const lines = block
                        .split("\n")
                        .map((l) => l.trim())
                        .filter(Boolean);

                    // ─── Date detection ────────────────────────────────────────────────
                    const dateLine = lines.find((l) => /\b(19|20)\d{2}\b/.test(l));
                    let issueingDate   = null;
                    let expirationDate = null;

                    if (dateLine) {
                        const years      = dateLine.match(/\b(19|20)\d{2}\b/gi) || [];
                        const hasExpiry  = /expir|valid until|valid till|expires/i.test(dateLine);
                        issueingDate     = years[0] || null;
                        expirationDate   = hasExpiry ? (years[1] || null) : null;
                    }

                    // ─── Issuing org detection ────────────────────────────────────────
                    const orgLine = lines.find((l) =>
                        /\b(google|microsoft|amazon|aws|meta|apple|oracle|ibm|cisco|coursera|udemy|linkedin|hackerrank|issuedby|certified by|awarded by|institute|university|college|association|foundation|organization)\b/i.test(l)
                    );

                    // ─── Description: everything that isn't the title/org/date ────────
                    const nonTitleLines = lines.slice(1).filter(l =>
                        l !== dateLine && l !== orgLine
                    );
                    const description = nonTitleLines.join(" ").trim() || null;

                    const nonDateLines = lines.filter(l => l !== dateLine);

                    return {
                        awardName:     nonDateLines[0] || null,
                        issueingOrg:   orgLine         || nonDateLines[1] || null,
                        description,
                        issueingDate,
                        expirationDate,
                    };
                })
                .filter((a) => a.awardName)
            : [];



        // language
        const LANGUAGES = [
            "English", "Arabic", "French", "Spanish", "German", "Chinese", "Mandarin",
            "Hindi", "Urdu", "Bengali", "Tamil", "Telugu", "Kannada", "Malayalam",
            "Marathi", "Punjabi", "Gujarati", "Portuguese", "Russian", "Japanese",
            "Korean", "Italian", "Dutch", "Turkish", "Persian", "Farsi", "Swahili",
            "Vietnamese", "Thai", "Indonesian", "Malay", "Polish", "Ukrainian",
            "Romanian", "Greek", "Hebrew", "Swedish", "Norwegian", "Danish", "Finnish",
        ];



        const langRegex = new RegExp(
            `(${LANGUAGES.join("|")})\\s*[-:(]?\\s*(Native|Bilingual|Fluent|Advanced|Professional|Proficient|Intermediate|Conversational|Basic|Elementary|Beginner|Mother\\s*Tongue)?`,
            "gi"
        );

        const langMatches = [];
        let langMatch;

        while ((langMatch = langRegex.exec(text)) !== null) {
            langMatches.push({
                language: langMatch[1].charAt(0).toUpperCase() + langMatch[1].slice(1).toLowerCase(), // normalize casing
                level: LEVEL_MAP[langMatch[2]?.toLowerCase()] ?? 2  // default Skillful
            });
        }

// Deduplicate
        const languages = [...new Map(
            langMatches.map(item => [item.language.toLowerCase(), item])
        ).values()];

        console.log(languages);
// [{ language: "English", level: 4 }, { language: "Arabic", level: 2 }, ...]
        return {
            firstName,
            lastName,
            fullName,
            role,
            email,
            phone,
            linkedin,
            country,
            city,
            portfolioUrl,
            nationality,
            professionalSummary,
            skills,
            education,
            experience,
            projects,
            awards,
            languages,
            rawText: text,
        };
    };

    const splitIntoBlocks = (raw) => {
        const lines = raw.split("\n").map(l => l.trim()).filter(Boolean);
        const blocks = [];
        let current  = [];

        for (const line of lines) {
            const isNewEntry =
                /^[A-Z]/.test(line) &&                          // starts with capital
                !/^[•\-–→*▪◦]/.test(line) &&                   // not a bullet point
                !/[.!?]$/.test(line) &&                         // doesn't end like a sentence
                !/ (and|the|to|of|in|at|for|with|was|is|are|were|has|have|by|on|as|an|a)\b/i.test(line) && // no common sentence words
                line.split(" ").length <= 8 &&                  // max 8 words (titles are short)
                line.length > 3 &&
                line.length < 80;

            if (isNewEntry && current.length > 0) {
                blocks.push(current.join("\n"));
                current = [line];
            } else {
                current.push(line);
            }
        }

        if (current.length > 0) blocks.push(current.join("\n"));
        return blocks;
    };
    try {
        console.log(req.file)
        // Guard: multer didn't attach a file
        if (!req.file) {

            return res.status(400).json({ success: false, message: "No file uploaded" });
        }

        // Step A: Extract plain text
        const rawText = await extractText(req.file);

        if (!rawText || rawText.trim().length === 0) {
            return res.status(422).json({
                success: false,
                message: "Could not extract text from the file. It may be scanned/image-based.",
            });
        }

        // Step B: Parse structured fields
        const parsedData = parseResumeText(rawText);

        // Step C: Send response
        return res.status(200).json({
            success: true,
            data: parsedData,
        });
    } catch (error) {
        console.error("Resume parse error:", error.message);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to parse resume",
        });
    }


}