import { useState, useEffect } from "react";
import { apiRequest } from "../../services/apiClient";
import { Attachment, Project } from "../../types";
import { FileText, Upload, Download, Search, FolderKanban, Trash2, Loader2, Image, File, CheckCircle2 } from "lucide-react";

export function FilesPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("ALL");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<{ projects: Project[] }>("/projects");
      setProjects(res.projects);

      // Collect attachments from projects
      const allFiles: Attachment[] = [];
      for (const p of res.projects) {
        try {
          const detail = await apiRequest<{ project: Project }>(`/projects/${p.id}`);
          if (detail.project.attachments) {
            allFiles.push(...detail.project.attachments);
          }
        } catch (e) {}
      }
      setAttachments(allFiles);
    } catch (err) {
      console.error("Failed to fetch files:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (selectedProjectId === "ALL" && projects.length > 0) {
      alert("Please select a specific project first to upload a file.");
      return;
    }

    const targetProjectId = selectedProjectId === "ALL" ? projects[0]?.id : selectedProjectId;
    if (!targetProjectId) {
      alert("Please create a project first before uploading files.");
      return;
    }

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        await apiRequest("/upload", {
          method: "POST",
          body: JSON.stringify({
            filename: file.name,
            content: base64,
            projectId: targetProjectId,
          }),
        });
        await loadData();
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("File upload failed:", err);
      alert("Failed to upload file");
    } finally {
      setUploading(false);
    }
  };

  const filteredFiles = attachments.filter((file) => {
    const matchesProject = selectedProjectId === "ALL" || file.projectId === selectedProjectId;
    const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesProject && matchesSearch;
  });

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(1) + " MB";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-[#f0ede6]">Project Files</h1>
          <p className="text-sm text-[#888888] mt-1">Centralized assets, design deliverables, and documentation.</p>
        </div>

        <div>
          <label className="cursor-pointer inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded bg-[#c8ff00] text-[#080808] hover:bg-[#b2e600] font-bold text-sm shadow-lg shadow-[#c8ff00]/20 transition">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            <span>Upload File</span>
            <input type="file" onChange={handleFileUpload} disabled={uploading} className="hidden" />
          </label>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#888888]" />
          <input
            type="text"
            placeholder="Search files by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded bg-[#111111] border border-[#222222] text-[#f0ede6] text-sm focus:outline-none focus:border-[#c8ff00] transition"
          />
        </div>

        <select
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          className="px-4 py-2 rounded bg-[#111111] border border-[#222222] text-[#f0ede6] text-sm focus:outline-none focus:border-[#c8ff00] transition cursor-pointer"
        >
          <option value="ALL">All Projects ({projects.length})</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.clientName})
            </option>
          ))}
        </select>
      </div>

      {/* Files Grid / List */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-[#888888]">
          <Loader2 className="w-6 h-6 animate-spin text-[#c8ff00] mr-2" />
          <span>Loading project assets...</span>
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="text-center py-16 px-4 rounded bg-[#111111] border border-[#222222]">
          <div className="w-12 h-12 rounded bg-[#181818] flex items-center justify-center text-[#888888] mx-auto mb-3">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold font-display text-[#f0ede6]">No files uploaded yet</h3>
          <p className="text-xs text-[#888888] mt-1 max-w-sm mx-auto">
            Upload design assets, project briefs, specifications, or documents to share with the team.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredFiles.map((file) => {
            const isImg = file.mimeType?.startsWith("image/") || /\.(png|jpg|jpeg|svg|webp|gif)$/i.test(file.name);
            const project = projects.find((p) => p.id === file.projectId);

            return (
              <div
                key={file.id}
                className="bg-[#111111] border border-[#222222] rounded p-4 flex flex-col justify-between card-article group hover:border-[#c8ff00]/40 transition"
              >
                <div>
                  <div className="h-32 rounded bg-[#181818] border border-[#222222] mb-3 flex items-center justify-center overflow-hidden relative">
                    {isImg ? (
                      <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                    ) : (
                      <File className="w-10 h-10 text-[#888888]" />
                    )}
                  </div>

                  <h4 className="text-sm font-bold text-[#f0ede6] truncate" title={file.name}>
                    {file.name}
                  </h4>
                  <div className="flex items-center justify-between text-xs text-[#888888] mt-1">
                    <span>{formatFileSize(file.size)}</span>
                    {project && <span className="truncate max-w-[120px] text-[#c8ff00]">{project.name}</span>}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#222222] flex items-center justify-between">
                  <span className="text-[11px] text-[#666666]">
                    {new Date(file.createdAt).toLocaleDateString()}
                  </span>
                  <a
                    href={file.url}
                    download={file.name}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg bg-[#181818] text-[#888888] hover:text-[#c8ff00] hover:bg-[#222222] transition"
                    title="Download File"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
