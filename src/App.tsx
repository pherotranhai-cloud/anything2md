import React, { useState, useRef } from 'react';
import { FileUp, FileText, Code2, Link as LinkIcon, Loader2, ArrowRight, Eye, Download } from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [isAsync, setIsAsync] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'preview' | 'markdown' | 'json'>('preview');
  const [disableImage, setDisableImage] = useState(false);
  const [enableSlides, setEnableSlides] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleDownload = () => {
    if (!result || result.error || result.job_id) return;

    let content = '';
    let filename = '';
    let type = 'text/plain';

    if (activeTab === 'markdown' || activeTab === 'preview') {
      content = result.markdown || '';
      filename = file ? `${file.name.replace(/\.pptx$/i, '')}.md` : 'output.md';
      type = 'text/markdown';
    } else if (activeTab === 'json') {
      content = JSON.stringify(result.jsonAst, null, 2);
      filename = file ? `${file.name.replace(/\.pptx$/i, '')}.json` : 'output.json';
      type = 'application/json';
    }

    if (!content) return;

    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('config', JSON.stringify({ disable_image: disableImage, enable_slides: enableSlides }));
    
    if (isAsync && webhookUrl) {
      formData.append('webhook_url', webhookUrl);
    }

    try {
      const endpoint = isAsync ? '/api/v1/convert/async' : '/api/v1/convert/sync';
      // If we are in dev, backend might be on another port but we mapped Vite proxy or we can just use relative
      // with Vite proxy. Let's specify full URL for safe measure using current host
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        let errorMsg = `Server error: ${response.status} ${response.statusText}`;
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            errorMsg = data.error || errorMsg;
          } else {
            const text = await response.text();
            errorMsg = `Server error ${response.status}: ` + text.substring(0, 100);
          }
        } catch(e) {}
        throw new Error(errorMsg);
      }

      let data;
      try {
        data = await response.json();
      } catch (e) {
        throw new Error("Invalid response from server. It might be an HTML error page because the file was too large or the server crashed.");
      }
      setResult(data);
    } catch (err: any) {
      console.error(err);
      setResult({ error: err.message || String(err) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans p-6 md:p-12 lg:p-24">
      <div className="max-w-5xl mx-auto space-y-12">
        <header className="space-y-4">
          <h1 className="text-4xl tracking-tight font-medium text-neutral-900">pptx2md Web API</h1>
          <p className="text-neutral-500 max-w-2xl leading-relaxed text-lg">
            A standalone microservice and webhook pipeline for extracting clean Markdown and JSON AST from PowerPoint files (<strong>.pptx</strong>), perfectly structured for LLM RAG injection.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Upload Card */}
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-neutral-200">
            <h2 className="text-xl font-medium mb-6">Convert File</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div 
                className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors cursor-pointer ${file ? 'border-blue-500 bg-blue-50/50' : 'border-neutral-200 hover:border-neutral-300'}`}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept=".pptx" 
                  onChange={handleFileChange} 
                />
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                    <FileUp size={28} />
                  </div>
                  {file ? (
                    <div>
                      <p className="font-medium text-neutral-900">{file.name}</p>
                      <p className="text-sm text-neutral-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  ) : (
                    <div>
                      <p className="font-medium text-neutral-900">Click or drag `.pptx` to upload</p>
                      <p className="text-sm text-neutral-500 mt-1">Presentation formats only</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4 border-b border-neutral-100 pb-4">
                  <button
                    type="button"
                    onClick={() => setIsAsync(false)}
                    className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-all ${!isAsync ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:bg-neutral-100'}`}
                  >
                    Sync (Direct)
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAsync(true)}
                    className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-all ${isAsync ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:bg-neutral-100'}`}
                  >
                    Async (Webhook)
                  </button>
                </div>

                <div className="space-y-4 py-2">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <h3 className="text-sm font-medium text-neutral-900">Disable Images</h3>
                      <p className="text-xs text-neutral-500">Skip extracting and embedding images</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={disableImage}
                      onClick={() => setDisableImage(!disableImage)}
                      className={`${disableImage ? 'bg-blue-600' : 'bg-neutral-200'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2`}
                    >
                      <span
                        aria-hidden="true"
                        className={`${disableImage ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                      />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <h3 className="text-sm font-medium text-neutral-900">Enable Slides</h3>
                      <p className="text-xs text-neutral-500">Break output into individual slides</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={enableSlides}
                      onClick={() => setEnableSlides(!enableSlides)}
                      className={`${enableSlides ? 'bg-blue-600' : 'bg-neutral-200'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2`}
                    >
                      <span
                        aria-hidden="true"
                        className={`${enableSlides ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                      />
                    </button>
                  </div>
                </div>

                {isAsync && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2 pt-2 border-t border-neutral-100">
                    <label className="text-sm font-medium text-neutral-700 flex items-center gap-2">
                      <LinkIcon size={16} /> Webhook URL
                    </label>
                    <input
                      type="url"
                      required
                      placeholder="https://your-webhook-endpoint.com/receive"
                      className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-mono"
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                    />
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={!file || loading || (isAsync && !webhookUrl)}
                className="w-full py-3.5 px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-100 disabled:text-neutral-400 text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : <FileText size={20} />}
                {loading ? 'Processing...' : (isAsync ? 'Dispatch Job' : 'Extract Document')}
              </button>
            </form>
          </div>

          {/* Results Area */}
          <div className="bg-neutral-900 rounded-3xl p-8 shadow-sm flex flex-col h-[600px] text-neutral-300">
             <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-medium text-white">Console Output</h2>
                {result && !result.job_id && !result.error && (
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setActiveTab('preview')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-2 ${activeTab === 'preview' ? 'bg-white/10 text-white' : 'text-neutral-400 hover:bg-white/5'}`}
                    >
                      <Eye size={14} /> Preview
                    </button>
                    <button 
                      onClick={() => setActiveTab('markdown')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-2 ${activeTab === 'markdown' ? 'bg-white/10 text-white' : 'text-neutral-400 hover:bg-white/5'}`}
                    >
                      <FileText size={14} /> Markdown
                    </button>
                    <button 
                      onClick={() => setActiveTab('json')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-2 ${activeTab === 'json' ? 'bg-white/10 text-white' : 'text-neutral-400 hover:bg-white/5'}`}
                    >
                      <Code2 size={14} /> JSON AST
                    </button>
                    <div className="w-px h-6 bg-white/10 mx-1"></div>
                    <button 
                      onClick={handleDownload}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-2 text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm"
                    >
                      <Download size={14} /> Download
                    </button>
                  </div>
                )}
             </div>

             <div className="flex-1 bg-black/50 border border-white/10 rounded-xl overflow-auto p-4 font-mono text-sm leading-relaxed">
                {!result ? (
                  <div className="h-full flex flex-col items-center justify-center text-neutral-600 gap-4">
                    <FileText size={48} className="opacity-20" />
                    <p>Output will appear here...</p>
                  </div>
                ) : result.error ? (
                  <div className="text-red-400 space-y-2">
                    <p className="font-semibold text-red-500">Error</p>
                    <p className="whitespace-pre-wrap">{result.error}</p>
                  </div>
                ) : result.job_id ? (
                  <div className="text-blue-400 space-y-2">
                    <p className="text-white">Webhook job dispatched successfully.</p>
                    <p>{">"} Job ID: {result.job_id}</p>
                    <p>{">"} Status: {result.status}</p>
                    <p className="mt-4 text-neutral-500">Wait for your webhook receiver to get the payload.</p>
                  </div>
                ) : activeTab === 'preview' ? (
                   <div className="prose prose-sm prose-invert max-w-none text-neutral-300 w-full h-full p-4 overflow-auto">
                     <Markdown remarkPlugins={[remarkGfm]}>
                        {result.markdown || '*No Markdown available.*'}
                     </Markdown>
                   </div>
                ) : (
                   <div className="w-full h-full overflow-auto p-4 font-mono text-sm leading-relaxed">
                     <pre className="whitespace-pre-wrap break-words">
                       {activeTab === 'markdown' ? result.markdown || 'No Markdown output' : JSON.stringify(result.jsonAst, null, 2)}
                     </pre>
                   </div>
                )}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
