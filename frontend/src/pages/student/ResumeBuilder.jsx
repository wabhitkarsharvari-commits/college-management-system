import { useCallback, useEffect, useRef, useState } from 'react';
import { apiRequest } from '../../api/client';
import Alert from '../../components/Alert';
import Loader from '../../components/Loader';

// ─── tiny helpers ────────────────────────────────────────────────
function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function emptyEducation() {
  return { _id: uid(), degree: '', institution: '', year: '', percentage: '' };
}
function emptyExperience() {
  return { _id: uid(), company: '', role: '', duration: '', description: '' };
}
function emptyProject() {
  return { _id: uid(), title: '', tech: '', description: '', link: '' };
}
function emptyCertification() {
  return { _id: uid(), name: '', issuer: '', year: '' };
}
function emptyLanguage() {
  return { _id: uid(), name: '', level: '' };
}

const BLANK = {
  personal:       { phone: '', address: '', linkedin: '', github: '', website: '' },
  objective:      '',
  education:      [emptyEducation()],
  skills:         '',
  experience:     [],
  projects:       [],
  certifications: [],
  achievements:   '',
  languages:      [{ _id: uid(), name: 'English', level: 'Proficient' }],
};

function toForm(resume) {
  const tag = (arr) => (arr || []).map((x) => ({ _id: uid(), ...x }));
  return {
    personal:       { ...BLANK.personal, ...(resume.personal || {}) },
    objective:      resume.objective      || '',
    education:      tag(resume.education).length  ? tag(resume.education)  : [emptyEducation()],
    skills:         resume.skills         || '',
    experience:     tag(resume.experience),
    projects:       tag(resume.projects),
    certifications: tag(resume.certifications),
    achievements:   resume.achievements   || '',
    languages:      tag(resume.languages).length ? tag(resume.languages) : [{ _id: uid(), name: 'English', level: 'Proficient' }],
  };
}

// ─── section-header component ────────────────────────────────────
function SectionHeader({ icon, title, onAdd, addLabel }) {
  return (
    <div className="rb-section-header">
      <h2 className="rb-section-title">
        <span className="rb-section-icon">{icon}</span> {title}
      </h2>
      {onAdd && (
        <button type="button" className="rb-add-btn" onClick={onAdd}>
          + {addLabel || 'Add'}
        </button>
      )}
    </div>
  );
}

// ─── collapsible item card ────────────────────────────────────────
function ItemCard({ label, onRemove, children }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rb-item-card">
      <div className="rb-item-card-header">
        <button
          type="button"
          className="rb-item-toggle"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          <span className="rb-item-toggle-icon">{open ? '▾' : '▸'}</span>
          {label || 'Entry'}
        </button>
        <button
          type="button"
          className="rb-remove-btn"
          onClick={onRemove}
          aria-label="Remove entry"
        >
          ✕
        </button>
      </div>
      {open && <div className="rb-item-card-body">{children}</div>}
    </div>
  );
}

// ─── live preview ────────────────────────────────────────────────
function ResumePreview({ form, profileName, profileEmail, profileBranch, profileSemester }) {
  const skillList = form.skills
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <div className="resume-preview" id="resume-preview-root">
      {/* Header */}
      <div className="rv-header">
        <h1 className="rv-name">{profileName || 'Your Name'}</h1>
        <p className="rv-meta">
          {profileBranch && <span>{profileBranch}</span>}
          {profileSemester && <span>Semester {profileSemester}</span>}
        </p>
        <div className="rv-contacts">
          {profileEmail     && <span>✉ {profileEmail}</span>}
          {form.personal.phone    && <span>📞 {form.personal.phone}</span>}
          {form.personal.address  && <span>📍 {form.personal.address}</span>}
          {form.personal.linkedin && (
            <span>
              <a href={form.personal.linkedin} target="_blank" rel="noopener noreferrer">
                LinkedIn
              </a>
            </span>
          )}
          {form.personal.github && (
            <span>
              <a href={form.personal.github} target="_blank" rel="noopener noreferrer">
                GitHub
              </a>
            </span>
          )}
          {form.personal.website && (
            <span>
              <a href={form.personal.website} target="_blank" rel="noopener noreferrer">
                Portfolio
              </a>
            </span>
          )}
        </div>
      </div>

      {/* Objective */}
      {form.objective && (
        <div className="rv-section">
          <div className="rv-section-title">Career Objective</div>
          <p className="rv-objective">{form.objective}</p>
        </div>
      )}

      {/* Education */}
      {form.education.filter((e) => e.degree || e.institution).length > 0 && (
        <div className="rv-section">
          <div className="rv-section-title">Education</div>
          {form.education
            .filter((e) => e.degree || e.institution)
            .map((e) => (
              <div key={e._id} className="rv-entry">
                <div className="rv-entry-main">
                  <strong>{e.degree}</strong>
                  {e.institution && <span> — {e.institution}</span>}
                </div>
                <div className="rv-entry-meta">
                  {e.year        && <span>{e.year}</span>}
                  {e.percentage  && <span>{e.percentage}%</span>}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Skills */}
      {skillList.length > 0 && (
        <div className="rv-section">
          <div className="rv-section-title">Technical Skills</div>
          <div className="rv-skills">
            {skillList.map((s, i) => (
              <span key={i} className="rv-skill-chip">{s}</span>
            ))}
          </div>
        </div>
      )}

      {/* Experience */}
      {form.experience.filter((e) => e.company || e.role).length > 0 && (
        <div className="rv-section">
          <div className="rv-section-title">Work Experience</div>
          {form.experience
            .filter((e) => e.company || e.role)
            .map((e) => (
              <div key={e._id} className="rv-entry">
                <div className="rv-entry-main">
                  <strong>{e.role}</strong>
                  {e.company && <span> — {e.company}</span>}
                </div>
                <div className="rv-entry-meta">
                  {e.duration && <span>{e.duration}</span>}
                </div>
                {e.description && (
                  <p className="rv-entry-desc">{e.description}</p>
                )}
              </div>
            ))}
        </div>
      )}

      {/* Projects */}
      {form.projects.filter((p) => p.title).length > 0 && (
        <div className="rv-section">
          <div className="rv-section-title">Projects</div>
          {form.projects
            .filter((p) => p.title)
            .map((p) => (
              <div key={p._id} className="rv-entry">
                <div className="rv-entry-main">
                  <strong>{p.title}</strong>
                  {p.tech && <span className="rv-tech"> [{p.tech}]</span>}
                  {p.link && (
                    <a
                      href={p.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rv-link"
                    >
                      {' '}↗
                    </a>
                  )}
                </div>
                {p.description && (
                  <p className="rv-entry-desc">{p.description}</p>
                )}
              </div>
            ))}
        </div>
      )}

      {/* Certifications */}
      {form.certifications.filter((c) => c.name).length > 0 && (
        <div className="rv-section">
          <div className="rv-section-title">Certifications</div>
          {form.certifications
            .filter((c) => c.name)
            .map((c) => (
              <div key={c._id} className="rv-entry rv-cert-entry">
                <strong>{c.name}</strong>
                {c.issuer && <span> — {c.issuer}</span>}
                {c.year   && <span className="rv-cert-year"> ({c.year})</span>}
              </div>
            ))}
        </div>
      )}

      {/* Achievements */}
      {form.achievements && (
        <div className="rv-section">
          <div className="rv-section-title">Achievements &amp; Activities</div>
          <p className="rv-objective">{form.achievements}</p>
        </div>
      )}

      {/* Languages */}
      {form.languages.filter((l) => l.name).length > 0 && (
        <div className="rv-section">
          <div className="rv-section-title">Languages</div>
          <div className="rv-languages">
            {form.languages
              .filter((l) => l.name)
              .map((l) => (
                <span key={l._id} className="rv-lang-item">
                  <strong>{l.name}</strong>
                  {l.level && <small> ({l.level})</small>}
                </span>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────
export default function ResumeBuilder() {
  const [form, setForm]       = useState(BLANK);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState('');
  const [activeTab, setActiveTab] = useState('editor'); // 'editor' | 'preview'
  const savedTimer = useRef(null);

  // ── load ──────────────────────────────────────────────────────
  useEffect(() => {
    Promise.allSettled([
      apiRequest('/students/resume'),
      apiRequest('/students/me'),
    ]).then(([resumeRes, profileRes]) => {
      if (resumeRes.status === 'fulfilled') {
        setForm(toForm(resumeRes.value.resume));
      }
      if (profileRes.status === 'fulfilled') {
        setProfile(profileRes.value.student || null);
      }
    }).catch((err) => {
      setError(err.message || 'Could not load resume.');
    }).finally(() => setLoading(false));
  }, []);

  // ── save ──────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    setSaving(true);
    setError('');
    setSaved(false);
    clearTimeout(savedTimer.current);
    try {
      await apiRequest('/students/resume', { method: 'PUT', body: form });
      setSaved(true);
      savedTimer.current = setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.message || 'Failed to save resume.');
    } finally {
      setSaving(false);
    }
  }, [form]);

  // ── print ─────────────────────────────────────────────────────
  function handlePrint() {
    window.print();
  }

  // ── field helpers ─────────────────────────────────────────────
  function setPersonal(field, value) {
    setForm((f) => ({ ...f, personal: { ...f.personal, [field]: value } }));
  }

  // list section helpers
  function addItem(section, factory) {
    setForm((f) => ({ ...f, [section]: [...f[section], factory()] }));
  }
  function removeItem(section, id) {
    setForm((f) => ({ ...f, [section]: f[section].filter((x) => x._id !== id) }));
  }
  function updateItem(section, id, field, value) {
    setForm((f) => ({
      ...f,
      [section]: f[section].map((x) =>
        x._id === id ? { ...x, [field]: value } : x
      ),
    }));
  }

  if (loading) return <Loader />;

  return (
    <div className="rb-root">
      {/* ── page header ── */}
      <div className="page-header rb-page-header">
        <div>
          <h1>Resume Builder</h1>
          <p>Build, preview and print your professional resume.</p>
        </div>
        <div className="rb-header-actions">
          <button
            type="button"
            className={`rb-tab-btn ${activeTab === 'editor' ? 'active' : ''}`}
            onClick={() => setActiveTab('editor')}
          >
            ✏ Edit
          </button>
          <button
            type="button"
            className={`rb-tab-btn ${activeTab === 'preview' ? 'active' : ''}`}
            onClick={() => setActiveTab('preview')}
          >
            👁 Preview
          </button>
          <button
            type="button"
            className="btn"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving…' : '💾 Save'}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handlePrint}
          >
            🖨 Print / PDF
          </button>
        </div>
      </div>

      {error  && <Alert type="error">{error}</Alert>}
      {saved  && <Alert type="success">Resume saved successfully.</Alert>}

      {/* ── two-column layout: editor | preview ── */}
      <div className={`rb-layout ${activeTab === 'preview' ? 'rb-layout-preview-only' : ''}`}>

        {/* ════════════════ EDITOR PANEL ════════════════ */}
        <div className={`rb-editor ${activeTab === 'preview' ? 'rb-hidden-mobile' : ''}`}>

          {/* 1. Personal Info */}
          <div className="rb-section-panel">
            <SectionHeader icon="👤" title="Personal Information" />
            <div className="rb-form-grid">
              <div className="form-group">
                <label>Full Name</label>
                <input
                  value={profile?.name || ''}
                  disabled
                  className="rb-disabled-input"
                  title="Update your name from the profile page"
                />
                <small>Pulled from your profile (read-only)</small>
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  value={profile?.email || ''}
                  disabled
                  className="rb-disabled-input"
                />
                <small>Pulled from your profile (read-only)</small>
              </div>
              <div className="form-group">
                <label>Phone Number</label>
                <input
                  placeholder="e.g. +91 98765 43210"
                  value={form.personal.phone}
                  onChange={(e) => setPersonal('phone', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>City / Address</label>
                <input
                  placeholder="e.g. Nagpur, Maharashtra"
                  value={form.personal.address}
                  onChange={(e) => setPersonal('address', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>LinkedIn URL</label>
                <input
                  type="url"
                  placeholder="https://linkedin.com/in/yourname"
                  value={form.personal.linkedin}
                  onChange={(e) => setPersonal('linkedin', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>GitHub URL</label>
                <input
                  type="url"
                  placeholder="https://github.com/yourname"
                  value={form.personal.github}
                  onChange={(e) => setPersonal('github', e.target.value)}
                />
              </div>
              <div className="form-group rb-full-span">
                <label>Portfolio / Website</label>
                <input
                  type="url"
                  placeholder="https://yourportfolio.com"
                  value={form.personal.website}
                  onChange={(e) => setPersonal('website', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* 2. Objective */}
          <div className="rb-section-panel">
            <SectionHeader icon="🎯" title="Career Objective" />
            <div className="form-group">
              <label>Objective / Summary</label>
              <textarea
                rows={4}
                placeholder="A brief statement about your career goals and what you bring to the role…"
                value={form.objective}
                onChange={(e) => setForm((f) => ({ ...f, objective: e.target.value }))}
              />
              <small>{form.objective.length} / 1000 characters</small>
            </div>
          </div>

          {/* 3. Education */}
          <div className="rb-section-panel">
            <SectionHeader
              icon="🎓"
              title="Education"
              onAdd={() => addItem('education', emptyEducation)}
              addLabel="Add Degree"
            />
            {form.education.map((e) => (
              <ItemCard
                key={e._id}
                label={e.degree || e.institution || 'New Entry'}
                onRemove={() => removeItem('education', e._id)}
              >
                <div className="rb-form-grid">
                  <div className="form-group rb-full-span">
                    <label>Degree / Course</label>
                    <input
                      placeholder="e.g. B.Tech Computer Science"
                      value={e.degree}
                      onChange={(ev) => updateItem('education', e._id, 'degree', ev.target.value)}
                    />
                  </div>
                  <div className="form-group rb-full-span">
                    <label>Institution Name</label>
                    <input
                      placeholder="e.g. Government College of Engineering, Nagpur"
                      value={e.institution}
                      onChange={(ev) => updateItem('education', e._id, 'institution', ev.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Year / Duration</label>
                    <input
                      placeholder="e.g. 2020 – 2024"
                      value={e.year}
                      onChange={(ev) => updateItem('education', e._id, 'year', ev.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Score / Percentage / CGPA</label>
                    <input
                      placeholder="e.g. 8.6 CGPA or 82%"
                      value={e.percentage}
                      onChange={(ev) => updateItem('education', e._id, 'percentage', ev.target.value)}
                    />
                  </div>
                </div>
              </ItemCard>
            ))}
          </div>

          {/* 4. Skills */}
          <div className="rb-section-panel">
            <SectionHeader icon="💡" title="Technical Skills" />
            <div className="form-group">
              <label>Skills (comma-separated)</label>
              <textarea
                rows={3}
                placeholder="e.g. Python, Java, React, Node.js, MySQL, Git, Docker…"
                value={form.skills}
                onChange={(e) => setForm((f) => ({ ...f, skills: e.target.value }))}
              />
              <small>Separate each skill with a comma. They appear as tags in the preview.</small>
            </div>
            {/* Tag preview */}
            {form.skills.trim() && (
              <div className="rb-skill-preview">
                {form.skills.split(',').map((s) => s.trim()).filter(Boolean).map((s, i) => (
                  <span key={i} className="rv-skill-chip">{s}</span>
                ))}
              </div>
            )}
          </div>

          {/* 5. Experience */}
          <div className="rb-section-panel">
            <SectionHeader
              icon="💼"
              title="Work Experience / Internships"
              onAdd={() => addItem('experience', emptyExperience)}
              addLabel="Add Experience"
            />
            {form.experience.length === 0 && (
              <p className="rb-empty-hint">No experience added yet. Click "+ Add Experience" to begin.</p>
            )}
            {form.experience.map((e) => (
              <ItemCard
                key={e._id}
                label={e.role || e.company || 'New Entry'}
                onRemove={() => removeItem('experience', e._id)}
              >
                <div className="rb-form-grid">
                  <div className="form-group">
                    <label>Job Title / Role</label>
                    <input
                      placeholder="e.g. Software Engineering Intern"
                      value={e.role}
                      onChange={(ev) => updateItem('experience', e._id, 'role', ev.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Company / Organisation</label>
                    <input
                      placeholder="e.g. TCS, Infosys, Startup XYZ"
                      value={e.company}
                      onChange={(ev) => updateItem('experience', e._id, 'company', ev.target.value)}
                    />
                  </div>
                  <div className="form-group rb-full-span">
                    <label>Duration</label>
                    <input
                      placeholder="e.g. May 2023 – Jul 2023 (3 months)"
                      value={e.duration}
                      onChange={(ev) => updateItem('experience', e._id, 'duration', ev.target.value)}
                    />
                  </div>
                  <div className="form-group rb-full-span">
                    <label>Description / Responsibilities</label>
                    <textarea
                      rows={3}
                      placeholder="Describe your key responsibilities, tools used and achievements…"
                      value={e.description}
                      onChange={(ev) => updateItem('experience', e._id, 'description', ev.target.value)}
                    />
                  </div>
                </div>
              </ItemCard>
            ))}
          </div>

          {/* 6. Projects */}
          <div className="rb-section-panel">
            <SectionHeader
              icon="🚀"
              title="Projects"
              onAdd={() => addItem('projects', emptyProject)}
              addLabel="Add Project"
            />
            {form.projects.length === 0 && (
              <p className="rb-empty-hint">No projects added yet. Click "+ Add Project" to begin.</p>
            )}
            {form.projects.map((p) => (
              <ItemCard
                key={p._id}
                label={p.title || 'New Project'}
                onRemove={() => removeItem('projects', p._id)}
              >
                <div className="rb-form-grid">
                  <div className="form-group rb-full-span">
                    <label>Project Title</label>
                    <input
                      placeholder="e.g. College Management System"
                      value={p.title}
                      onChange={(ev) => updateItem('projects', p._id, 'title', ev.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Technologies Used</label>
                    <input
                      placeholder="e.g. React, Node.js, MongoDB"
                      value={p.tech}
                      onChange={(ev) => updateItem('projects', p._id, 'tech', ev.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>GitHub / Live Link</label>
                    <input
                      type="url"
                      placeholder="https://github.com/you/project"
                      value={p.link}
                      onChange={(ev) => updateItem('projects', p._id, 'link', ev.target.value)}
                    />
                  </div>
                  <div className="form-group rb-full-span">
                    <label>Description</label>
                    <textarea
                      rows={3}
                      placeholder="What does it do? What problem does it solve? What did you build?"
                      value={p.description}
                      onChange={(ev) => updateItem('projects', p._id, 'description', ev.target.value)}
                    />
                  </div>
                </div>
              </ItemCard>
            ))}
          </div>

          {/* 7. Certifications */}
          <div className="rb-section-panel">
            <SectionHeader
              icon="🏆"
              title="Certifications"
              onAdd={() => addItem('certifications', emptyCertification)}
              addLabel="Add Certificate"
            />
            {form.certifications.length === 0 && (
              <p className="rb-empty-hint">No certifications added yet.</p>
            )}
            {form.certifications.map((c) => (
              <ItemCard
                key={c._id}
                label={c.name || 'New Certificate'}
                onRemove={() => removeItem('certifications', c._id)}
              >
                <div className="rb-form-grid">
                  <div className="form-group rb-full-span">
                    <label>Certificate Name</label>
                    <input
                      placeholder="e.g. AWS Certified Cloud Practitioner"
                      value={c.name}
                      onChange={(ev) => updateItem('certifications', c._id, 'name', ev.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Issuing Organisation</label>
                    <input
                      placeholder="e.g. Amazon Web Services"
                      value={c.issuer}
                      onChange={(ev) => updateItem('certifications', c._id, 'issuer', ev.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Year</label>
                    <input
                      placeholder="e.g. 2024"
                      value={c.year}
                      onChange={(ev) => updateItem('certifications', c._id, 'year', ev.target.value)}
                    />
                  </div>
                </div>
              </ItemCard>
            ))}
          </div>

          {/* 8. Achievements */}
          <div className="rb-section-panel">
            <SectionHeader icon="⭐" title="Achievements &amp; Extra-Curricular" />
            <div className="form-group">
              <label>Activities, Awards &amp; Achievements</label>
              <textarea
                rows={4}
                placeholder="e.g. First place in college hackathon, NSS volunteer, class representative…"
                value={form.achievements}
                onChange={(e) => setForm((f) => ({ ...f, achievements: e.target.value }))}
              />
            </div>
          </div>

          {/* 9. Languages */}
          <div className="rb-section-panel">
            <SectionHeader
              icon="🌐"
              title="Languages"
              onAdd={() => addItem('languages', emptyLanguage)}
              addLabel="Add Language"
            />
            {form.languages.map((l) => (
              <ItemCard
                key={l._id}
                label={l.name || 'New Language'}
                onRemove={() => removeItem('languages', l._id)}
              >
                <div className="rb-form-grid">
                  <div className="form-group">
                    <label>Language</label>
                    <input
                      placeholder="e.g. Hindi"
                      value={l.name}
                      onChange={(ev) => updateItem('languages', l._id, 'name', ev.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Proficiency Level</label>
                    <select
                      value={l.level}
                      onChange={(ev) => updateItem('languages', l._id, 'level', ev.target.value)}
                    >
                      <option value="">Select level</option>
                      <option>Native</option>
                      <option>Proficient</option>
                      <option>Intermediate</option>
                      <option>Basic</option>
                    </select>
                  </div>
                </div>
              </ItemCard>
            ))}
          </div>

          {/* Save button at bottom */}
          <div className="rb-bottom-save">
            <button
              type="button"
              className="btn"
              onClick={handleSave}
              disabled={saving}
              style={{ minWidth: 140 }}
            >
              {saving ? 'Saving…' : '💾 Save Resume'}
            </button>
            {saved && <span className="rb-saved-tick">✓ Saved!</span>}
          </div>
        </div>

        {/* ════════════════ PREVIEW PANEL ════════════════ */}
        <div className={`rb-preview-panel ${activeTab === 'editor' ? 'rb-preview-desktop-only' : ''}`}>
          <div className="rb-preview-sticky">
            <div className="rb-preview-toolbar">
              <span className="rb-preview-label">Live Preview</span>
              <button
                type="button"
                className="btn btn-secondary btn-small"
                onClick={handlePrint}
              >
                🖨 Print / Save PDF
              </button>
            </div>
            <div className="rb-preview-scroll">
              <ResumePreview
                form={form}
                profileName={profile?.name}
                profileEmail={profile?.email}
                profileBranch={profile?.branch}
                profileSemester={profile?.semester}
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
