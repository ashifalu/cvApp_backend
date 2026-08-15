const puppeteer = require('puppeteer')
const resumes = require('../model/resumeModel')
const info = require('../model/infoModel')

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
    const {
        resume_id,
        personalInfo,
        professionalSummary,
        experience,
        education,
        projects,
        awards,
        certifications,
        skills,
        languages,
        resumeUrl,
        template,
        theme
    } = req.body

    try {
        let savedResume;

        if (resume_id) {
            // ── UPDATE existing resume ──
            savedResume = await resumes.findByIdAndUpdate(
                resume_id,
                {
                    title: personalInfo.role,
                    pdfUrl: resumeUrl,
                    previewData: {
                        personalInfo,
                        professionalSummary,
                        experience,
                        education,
                        projects,
                        awards,
                        certifications,
                        skills,
                        languages,
                    },
                    template,
                    theme,
                },
                { new: true, runValidators: true }
            );

            if (!savedResume) {
                return res.status(404).json({ message: 'Resume not found' });
            }

        } else {
            // ── CREATE new resume ──
            const newResume = new resumes({
                user: userId,
                title: personalInfo.role,
                pdfUrl: resumeUrl,
                previewData: {
                    personalInfo,
                    professionalSummary,
                    experience,
                    education,
                    projects,
                    awards,
                    certifications,
                    skills,
                    languages,
                },
                template,
                theme,
            });

            savedResume = await newResume.save();
        }

        // Find existing record for this user
        const existing = await info.findOne({ user: userId })

        if (existing) {
            // UPDATE — merge arrays, don't replace

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
            existing.certifications = mergeArray(existing.certifications, certifications, 'certificateName');
            existing.skills = mergeArray(existing.skills, skills, 'skill');
            existing.languages = mergeArray(existing.languages, languages, 'language');

            await existing.save();

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
                certifications: certifications || [],
                skills: skills || [],
                languages: languages || [],
            });

            await newInfo.save();
        }

        res.status(resume_id ? 200 : 201).json({
            message: resume_id ? 'CV updated successfully' : 'CV created successfully',
            data: savedResume
        });

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

        return res.status(200).json({
            resumes: all_resumes,
            info: all_infos
        }) 
    } catch (error) {
        console.log("error:", error.message);
        res.status(500).json(error)
    }
    
}

exports.deleteResumeController = async (req,res) => {
    const id = req.params.id;
    console.log(id)
    try {
        await resumes.findByIdAndDelete({_id:id})
        res.status(200).json('resume deleted successfully')
    } catch (error) {
        console.log(error)
        res.status(500).json(error)
    }
}