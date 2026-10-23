import React, { useState } from 'react';
import { Mail, Copy, Check, Download, FileText } from 'lucide-react';
import { EngineResult } from '../../engine';
import { generateClaimEmail, downloadFile } from '../../utils/export';

interface Step8EmailProps {
  result: EngineResult;
}

export const Step8Email: React.FC<Step8EmailProps> = ({ result }) => {
  const [copied, setCopied] = useState(false);
  const emailText = generateClaimEmail(result);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(emailText);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error('Failed to copy to clipboard', err);
    }
  };

  const handleDownload = () => {
    downloadFile(
      emailText,
      `claim_email_Park_${result.report.targetPark}.txt`,
      'text/plain;charset=utf-8'
    );
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Title */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <Mail className="w-5 h-5 text-blue-600" />
            <span>Step 8 &bull; Insurance Claim E-mail Generation</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Automated claim notification text formatted according to insurance adjuster requirements with full empirical uncertainty.
          </p>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center space-x-2">
          <FileText className="w-5 h-5 text-slate-500" />
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Ready-to-File Claim Email &bull; Park {result.report.targetPark}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleCopy}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer shadow-xs ${
              copied
                ? 'bg-emerald-600 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied to Clipboard!' : 'Copy Email Text'}</span>
          </button>

          <button
            onClick={handleDownload}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download .txt</span>
          </button>
        </div>
      </div>

      {/* Email Body Preview Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <pre className="font-mono text-xs sm:text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed select-all bg-slate-50 dark:bg-slate-800/60 p-5 rounded-xl border border-slate-200 dark:border-slate-700">
          {emailText}
        </pre>
      </div>
    </div>
  );
};
