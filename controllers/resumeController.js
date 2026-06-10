const puppeteer = require('puppeteer')
const resumes = require('../model/resumeModel')
const info = require('../model/infoModel')
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");


exports.resumeParseController = async (req, res) => {
    const extractText = async (file) => {
        const { mimetype, buffer } = file;

        if (mimetype === "application/pdf") {
            const data = await pdfParse(buffer);
            return data.text; // plain text from PDF
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

    const parseResumeText = (text) => {
        const lines = text
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean);

        // --- Email ---
        const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        const email = emailMatch ? emailMatch[0] : null;

        // --- Phone ---
        const phoneMatch = text.match(/(\+?\d[\d\s\-().]{7,}\d)/);
        const phone = phoneMatch ? phoneMatch[0].trim() : null;

        // --- LinkedIn ---
        const linkedinMatch = text.match(/linkedin\.com\/in\/[a-zA-Z0-9_-]+/i);
        const linkedin = linkedinMatch ? `https://${linkedinMatch[0]}` : null;

        // --- Name (heuristic: first non-empty line) ---
        const name = lines[0] || null;

        // --- Skills (look for a "Skills" section) ---
        const skillsMatch = text.match(/skills[:\-]?\s*([\s\S]*?)(?=\n[A-Z]|\n\n|experience|education|$)/i);
        const skills = skillsMatch
            ? skillsMatch[1]
                .split(/[,\n|•]/)
                .map((s) => s.trim())
                .filter((s) => s.length > 1 && s.length < 40)
            : [];

        // --- Education (extract section text) ---
        const educationMatch = text.match(/education[:\-]?\s*([\s\S]*?)(?=\n[A-Z][A-Z]|\nexperience|\nskills|$)/i);
        const education = educationMatch ? educationMatch[1].trim() : null;

        // --- Experience (extract section text) ---
        const experienceMatch = text.match(/experience[:\-]?\s*([\s\S]*?)(?=\neducation|\nskills|\ncertif|$)/i);
        const experience = experienceMatch ? experienceMatch[1].trim() : null;

        return {
            name,
            email,
            phone,
            linkedin,
            skills,
            education,
            experience,
            rawText: text, // keep raw text for AI processing or debugging
        };
    };

    try {
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


exports.generatePdfController = async (req, res) => {
    console.log('Controller reached!'); // debug
    console.log('Body keys:', Object.keys(req.body)); // debug
    
    const { html } = req.body; // ← only receive html, not cssText
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: 'new',
            executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        
        const fullHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <!-- Load Tailwind from CDN directly -->
                <script src="https://cdn.tailwindcss.com"></script>
                <style>
                    * { 
                        -webkit-print-color-adjust: exact !important; 
                        print-color-adjust: exact !important;
                        box-sizing: border-box; 
                    }
                    body { margin: 0; padding: 0; background: white; }
                    #pdf-scale-wrapper { 
                        transform: none !important; 
                        margin: 0 !important; 
                        width: 794px !important; 
                    }
                    .print-page { 
                        margin: 0 !important; 
                        box-shadow: none !important; 
                        border: none !important; 
                    }
                </style>
            </head>
            <body>
                <div style="width:794px">${html}</div>
            </body>
            </html>
        `;

        // Set content and wait for Tailwind to load
        await page.setContent(fullHtml, { waitUntil: 'networkidle0' });
        await page.setViewport({ width: 794, height: 1123 });
        
        // Wait for Tailwind to apply styles
        await new Promise(resolve => setTimeout(resolve, 2000));

        console.log('Generating PDF...');

        const pdf = await page.pdf({
            width: '794px',
            height: '1123px',
            printBackground: true,
            margin: { top: 0, right: 0, bottom: 0, left: 0 },
        });

        console.log('PDF size:', pdf.length);

        // Save locally
        const fs = require('fs');
        const path = require('path');
        const uploadsDir = path.join(__dirname, '../uploads');
        
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const fileName = `resume_${Date.now()}.pdf`;
        const filePath = path.join(uploadsDir, fileName);
        fs.writeFileSync(filePath, pdf);

        const pdfUrl = `http://localhost:4000/uploads/${fileName}`;
        console.log('PDF URL:', pdfUrl);
        
        res.json({ pdfUrl });

    } catch (error) {
        console.error('PDF error:', error.message);
        res.status(500).json({ error: error.message });
    } finally {
        if (browser) await browser.close();
    }
}

exports.storeDataController = async (req, res) => {
    console.log("storeDataController reached")
    const userId = req.user.id
    const { personalInfo,
            professionalSummary,
            experience,
            education,
            projects,
            awards,
            skills,
            languages,
            resumeUrl } = req.body
            console.log(req.body)

            try {
                const newResume = new resumes({
                    user: userId,
                    title: personalInfo.role,
                    pdfUrl: resumeUrl
                })

                const savedResumes= await newResume.save()
                console.log(savedResumes)

                // Find existing record for this user
                const existing = await info.findOne({ user: userId })
        
                if (existing) {
                    // UPDATE — merge arrays, don't replace
        
                    // For arrays: add only NEW items that don't already exist
                    const mergeArray = (existingArr, newArr, uniqueKey) => {
                        if (!newArr || newArr.length === 0) return existingArr;
                        
                        const merged = [...existingArr];
                        newArr.forEach(newItem => {
                            const alreadyExists = existingArr.some(
                                existing => JSON.stringify(existing[uniqueKey]) === JSON.stringify(newItem[uniqueKey])
                            );
                            if (!alreadyExists) {
                                merged.push(newItem);
                            }
                        });
                        return merged;
                    };
        
                    existing.personalInfo = personalInfo || existing.personalInfo;
                    existing.education = mergeArray(existing.education, education, 'school');
                    existing.experience = mergeArray(existing.experience, experience, 'jobTitle');
                    existing.projects = mergeArray(existing.projects, projects, 'projectTitle');
                    existing.awards = mergeArray(existing.awards, awards, 'awardName');
                    existing.skills = mergeArray(existing.skills, skills, 'skill');
                    existing.languages = mergeArray(existing.languages, languages, 'language');
                    // if (resumeUrl) existing.resumeUrl = resumeUrl;
        
                    const updated = await existing.save();
                    res.status(200).json({ 
                        message: 'CV updated successfully', 
                        data: updated 
                    });
        
                } else {
                    // CREATE — first time storing
                    const newInfo = new info({
                        user: userId,
                        personalInfo,
                        professionalSummary: professionalSummary,
                        education: education || [],
                        experience: experience || [],
                        projects: projects || [],
                        awards: awards || [],
                        skills: skills || [],
                        languages: languages || [],
                        // resumeUrl: resumeUrl || ''
                    });
        
                    const saved = await newInfo.save();
                    res.status(201).json({ 
                        message: 'CV created successfully', 
                        data: saved 
                    });
                }
        
            } catch (error) {
                console.error('Store error:', error);
                res.status(500).json({ error: 'Failed to store CV data' });
            }
        

}

exports.getAllResumesController = async (req,res) => {
    console.log("resumes");
    const userId = req.user.id
    console.log(userId);
    try {
        const all_resumes = await resumes.find({user:userId})
        const all_infos = await info.find({user:userId})
        console.log(all_resumes);
        console.log(all_infos);
        // if(!all_resumes || all_resumes.length == 0){
        //    return res.status(200).json([]) 
        // }
        return res.status(200).json({
            resumes: all_resumes,
            info: all_infos
        }) 
    } catch (error) {
        console.log("error:", error.message);
        res.status(500).json(error)
    }
    
}