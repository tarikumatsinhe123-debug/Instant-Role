import React from "react";
import { Download, FileText, Briefcase, Mail } from "lucide-react";
import { motion } from "motion/react";

interface ResumeViewerProps {
  data: {
    resume: {
      summary: string;
      experience: any[];
      skills: string[];
    };
    coverLetter: string;
  };
}

export const ResumeViewer: React.FC<ResumeViewerProps> = ({ data }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-5xl mx-auto space-y-12 pb-32"
    >
      <div className="flex justify-center items-center gap-4">
        <div className="h-[1px] flex-1 bg-slate-200" />
        <button className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-900 rounded-full hover:bg-slate-50 transition-all text-xs font-bold uppercase tracking-widest shadow-sm">
          <Download size={14} />
          <span>Export as PDF</span>
        </button>
        <div className="h-[1px] flex-1 bg-slate-200" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
        {/* Resume Section */}
        <div className="lg:col-span-3 bg-white p-12 rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-slate-100 h-fit">
          <div className="flex items-center gap-3 mb-10 pb-6 border-b border-slate-50">
            <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Curriculum Vitae</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">AI ARCHITECTED PROFILE</p>
            </div>
          </div>
          
          <div className="space-y-10">
            <section className="space-y-3">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Summary</div>
              <p className="text-slate-600 leading-relaxed text-sm antialiased">{data.resume.summary}</p>
            </section>

            <section className="space-y-6">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Experience</div>
              <div className="space-y-8">
                {data.resume.experience.map((exp, i) => (
                  <div key={i} className="group relative">
                    <div className="flex justify-between items-baseline mb-1">
                      <h4 className="font-bold text-slate-900 group-hover:text-black transition-colors">{exp.title}</h4>
                      <span className="text-[10px] font-bold text-slate-300 tabular-nums uppercase">{exp.period}</span>
                    </div>
                    <p className="text-xs text-slate-400 font-bold mb-3 tracking-wide border-b border-slate-50 pb-2">{exp.company}</p>
                    <ul className="space-y-2">
                      {exp.bullets.map((bullet: string, j: number) => (
                        <li key={j} className="text-slate-500 flex items-start text-sm leading-relaxed">
                          <span className="mr-3 text-slate-200">•</span>
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-4">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Technical Proficiencies</div>
              <div className="flex flex-wrap gap-2">
                {data.resume.skills.map((skill, i) => (
                  <span key={i} className="px-3 py-1 bg-slate-50 text-slate-600 rounded-lg text-[11px] font-bold border border-slate-100 uppercase tracking-wider">
                    {skill}
                  </span>
                ))}
              </div>
            </section>
          </div>
        </div>

        {/* Cover Letter Section */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-slate-100 h-fit">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-slate-100 text-slate-900 rounded-xl flex items-center justify-center">
                <Mail size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold tracking-tight">Cover Letter</h2>
                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">CONTEXTUAL OVERVIEW</p>
              </div>
            </div>
            
            <div className="text-slate-500 text-sm whitespace-pre-wrap leading-relaxed antialiased italic border-l-2 border-slate-100 pl-6 py-2">
              {data.coverLetter}
            </div>
          </div>

          <div className="bg-slate-900 text-white p-8 rounded-[2rem] shadow-xl shadow-slate-900/10">
            <div className="flex items-center gap-3 mb-4">
              <Briefcase size={18} className="text-slate-400" />
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Application Tip</span>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              Consider tailoring the summary of your resume to specifically mention the unique challenges of the role you're applying for.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

