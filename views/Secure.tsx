
import React, { useEffect, useState, useRef } from 'react';
import { Application, User, Score, AREAS, Area, Role } from '../types';
import { COMMITTEE_DOCS, SCORING_CRITERIA, ROLE_PERMISSIONS } from '../constants';
import { api } from '../services/firebase';
import { Button, Card, Input, Modal, Select, Badge } from '../components/UI';

// Global Chart.js definition since we load it from CDN
declare const Chart: any;

// --- APPLICANT DASHBOARD ---
export const ApplicantDashboard: React.FC<{ user: User }> = ({ user }) => {
  const [apps, setApps] = useState<Application[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [stage2App, setStage2App] = useState<Application | null>(null);

  // Form State
  const [formData, setFormData] = useState({ projectTitle: '', orgName: '', amountRequested: 0, summary: '', area: 'Blaenavon' });

  useEffect(() => {
    api.getApplications().then(res => setApps(res.filter(a => a.userId === user.uid)));
  }, [user.uid]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ROLE_PERMISSIONS.applicant.canSubmit) {
        alert("Submissions are currently closed or restricted.");
        return;
    }
    await api.createApplication({
        ...formData,
        userId: user.uid,
        applicantName: user.displayName || 'Applicant',
        amountRequested: Number(formData.amountRequested),
        totalCost: Number(formData.amountRequested) + 1000 
    } as any);
    setIsCreating(false);
    const res = await api.getApplications();
    setApps(res.filter(a => a.userId === user.uid));
  };

  const handleStage2Submit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!stage2App) return;
      
      // Simulate "File Upload" by just updating the status and using a dummy URL if one isn't present
      await api.updateApplication(stage2App.id, {
          status: 'Submitted-Stage2',
          stage2PdfUrl: stage2App.stage2PdfUrl || stage2App.pdfUrl // In real app, this would be the new file URL
      });
      
      setStage2App(null);
      const res = await api.getApplications();
      setApps(res.filter(a => a.userId === user.uid));
      alert("Full Application (Stage 2) Submitted successfully!");
  }

  if (isCreating) {
    return (
        <div className="max-w-3xl mx-auto py-8 px-4 animate-fade-in">
            <Button variant="ghost" onClick={() => setIsCreating(false)} className="mb-4">&larr; Back to Dashboard</Button>
            <Card className="border-t-4 border-t-brand-purple">
                <div className="mb-6">
                    <h2 className="text-2xl font-bold font-dynapuff text-gray-800">Expression of Interest (Stage 1)</h2>
                    <p className="text-gray-500 text-sm">Round 2 • 2026 Cycle • Part 1 of 2</p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                        <Input label="Project Title" value={formData.projectTitle} onChange={e => setFormData({...formData, projectTitle: e.target.value})} required placeholder="e.g. Community Garden" />
                        <Input label="Organization / Group" value={formData.orgName} onChange={e => setFormData({...formData, orgName: e.target.value})} required placeholder="e.g. Blaenavon Green Team" />
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2 font-dynapuff">Primary Area of Benefit</label>
                            <select className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white" value={formData.area} onChange={e => setFormData({...formData, area: e.target.value})}>
                                {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                            </select>
                        </div>
                        <Input label="Grant Amount Requested (£)" type="number" value={formData.amountRequested} onChange={e => setFormData({...formData, amountRequested: Number(e.target.value)})} required />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2 font-dynapuff">Project Summary (Max 200 words)</label>
                        <textarea 
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-purple-100 outline-none h-32" 
                            value={formData.summary} 
                            onChange={e => setFormData({...formData, summary: e.target.value})} 
                            required 
                            placeholder="Describe what you want to do and who it will benefit..."
                        />
                    </div>
                    <div className="pt-4 flex justify-end gap-3">
                        <Button type="button" variant="outline" onClick={() => setIsCreating(false)}>Cancel</Button>
                        <Button type="submit">Submit Stage 1 (EOI)</Button>
                    </div>
                </form>
            </Card>
        </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-12 px-4">
        <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
            <div>
                <h2 className="text-3xl font-bold font-dynapuff text-gray-800">My Applications</h2>
                <p className="text-gray-500">Manage your funding requests and track progress.</p>
            </div>
            {ROLE_PERMISSIONS.applicant.canSubmit && (
                <Button onClick={() => setIsCreating(true)} className="shadow-xl">+ Start New Application (Stage 1)</Button>
            )}
        </div>
        
        <div className="grid gap-6">
            {apps.length === 0 && (
                <div className="text-center py-16 bg-white rounded-3xl border-2 border-dashed border-gray-200">
                    <p className="text-gray-400 font-bold text-lg mb-4">You haven't submitted any applications yet.</p>
                    {ROLE_PERMISSIONS.applicant.canSubmit && (
                        <Button variant="outline" onClick={() => setIsCreating(true)}>Create One Now</Button>
                    )}
                </div>
            )}
            {apps.map(app => (
                <Card key={app.id} className="flex flex-col md:flex-row justify-between items-center group hover:border-purple-200 transition-colors">
                    <div className="flex gap-6 items-center w-full">
                        <div className="w-16 h-16 rounded-2xl bg-purple-50 flex items-center justify-center text-brand-purple font-bold text-xl font-dynapuff shrink-0">
                            {app.amountRequested > 5000 ? '£££' : '££'}
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-mono text-gray-400 font-bold">{app.ref}</span>
                                <Badge>{app.status}</Badge>
                            </div>
                            <h3 className="font-bold text-xl text-gray-800 group-hover:text-brand-purple transition-colors">{app.projectTitle}</h3>
                            <p className="text-sm text-gray-500">{app.area} • {new Date(app.createdAt).toLocaleDateString()}</p>
                        </div>
                    </div>
                    <div className="mt-4 md:mt-0 md:ml-auto shrink-0 flex flex-col items-end gap-2">
                        {app.status === 'Invited-Stage2' && (
                             <Button size="sm" onClick={() => setStage2App(app)} className="bg-amber-500 hover:bg-amber-600 text-white shadow-amber-200">
                                Complete Stage 2
                             </Button>
                        )}
                        <Button size="sm" variant="outline">View Details</Button>
                    </div>
                </Card>
            ))}
        </div>

        {/* Stage 2 Modal */}
        <Modal isOpen={!!stage2App} onClose={() => setStage2App(null)} title="Stage 2: Full Application">
            <div className="mb-6 bg-blue-50 p-4 rounded-xl border border-blue-100 text-blue-800 text-sm">
                <strong>Great News!</strong> Your Expression of Interest was successful. You have been invited to submit your full application details.
            </div>
            <form onSubmit={handleStage2Submit} className="space-y-6">
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2 font-dynapuff">Upload Full Application (PDF)</label>
                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer">
                        <svg className="w-10 h-10 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                        <p className="text-sm text-gray-500">Click to browse or drag file here</p>
                        <p className="text-xs text-gray-400 mt-1">(Simulated upload)</p>
                    </div>
                </div>
                <div className="pt-4 flex justify-end gap-2 border-t">
                    <Button type="button" variant="ghost" onClick={() => setStage2App(null)}>Cancel</Button>
                    <Button type="submit">Submit Final Application</Button>
                </div>
            </form>
        </Modal>
    </div>
  );
};

// --- COMMITTEE DASHBOARD & SCORING ---
interface CommitteeProps { 
    user: User; 
    onUpdateUser: (u: User) => void; 
    isAdmin?: boolean; 
    onReturnToAdmin?: () => void;
}

export const CommitteeDashboard: React.FC<CommitteeProps> = ({ user, onUpdateUser, isAdmin, onReturnToAdmin }) => {
    const [view, setView] = useState<'home' | 'score' | 'viewer' | 'docs' | 'profile' | 'guide'>('home');
    const [apps, setApps] = useState<Application[]>([]);
    const [activeApp, setActiveApp] = useState<Application | null>(null);
    const [scores, setScores] = useState<Record<string, number>>({});
    const [notes, setNotes] = useState<Record<string, string>>({});
    const [myScores, setMyScores] = useState<Score[]>([]);
    const [allCommitteeScores, setAllCommitteeScores] = useState<Score[]>([]); // To calculate averages
    const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    
    // Admin Threshold Control
    const [threshold, setThreshold] = useState(65);
    
    // Profile Form State
    const [profileData, setProfileData] = useState({ displayName: user.displayName || '', bio: user.bio || '', phone: user.phone || '' });

    useEffect(() => {
        const fetchData = async () => {
            // Admin sees ALL apps, Committee sees filtered
            const areaFilter = isAdmin ? 'All' : user.area;
            const appList = await api.getApplications(areaFilter);
            setApps(appList);

            // Get all scores to calculate progress AND averages
            const allScoresData = await api.getScores();
            setAllCommitteeScores(allScoresData);
            
            // Filter for just MY scores
            const userScores = allScoresData.filter(s => s.scorerId === user.uid);
            setMyScores(userScores);
        };
        fetchData();
    }, [user.area, isAdmin, user.uid]);

    const handleStartScoring = (app: Application) => {
        setActiveApp(app);
        // Check if we have a score for this app already
        const existingScore = myScores.find(s => s.appId === app.id);
        if (existingScore) {
            setScores(existingScore.scores);
            setNotes(existingScore.notes);
        } else {
            setScores({});
            setNotes({});
        }
        setView('score');
    };

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        const updated = await api.updateUserProfile(user.uid, { 
            displayName: profileData.displayName,
            bio: profileData.bio,
            phone: profileData.phone,
            photoUrl: user.photoUrl || `https://ui-avatars.com/api/?name=${profileData.displayName}&background=9333ea&color=fff` 
        });
        onUpdateUser(updated);
        setView('home');
    };

    const handleSaveScore = async (isFinal = false) => {
        if (!activeApp) return;
        setIsSaving(true);
        const total = calculateTotal();
        const scoreData: Score = {
            appId: activeApp.id,
            scorerId: user.uid,
            scorerName: user.displayName || user.email,
            scores: scores,
            notes: notes,
            isFinal: isFinal,
            total: total,
            timestamp: Date.now()
        };
        await api.saveScore(scoreData);
        
        // Refresh local scores
        const allScoresData = await api.getScores();
        setAllCommitteeScores(allScoresData);
        setMyScores(allScoresData.filter(s => s.scorerId === user.uid));

        setIsSaving(false);
        if (isFinal) {
            alert("Final scores posted!");
            setActiveApp(null);
            setView('home');
        } else {
            alert("Draft saved successfully.");
        }
    };

    const calculateTotal = () => {
        return Object.entries(scores).reduce((total, [criterionId, score]) => {
            const criterion = SCORING_CRITERIA.find(c => c.id === criterionId);
            if (!criterion) return total;
            return total + (score / 3) * criterion.weight;
        }, 0);
    };

    const getRag = (total: number) => {
        // Use state threshold instead of hardcoded 65
        if (total >= threshold) return 'bg-green-100 text-green-700 border-green-200'; 
        if (total >= (threshold * 0.6)) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
        return 'bg-red-100 text-red-700 border-red-200';
    };

    // Helper to get average stats
    const getAppStats = (appId: string) => {
        const appScores = allCommitteeScores.filter(s => s.appId === appId && s.isFinal);
        if (appScores.length === 0) return { avg: "0.0", count: 0 };
        const total = appScores.reduce((acc, s) => acc + s.total, 0);
        return { avg: (total / appScores.length).toFixed(1), count: appScores.length };
    };

    // --- USER GUIDE MODAL ---
    const renderUserGuide = () => (
        <Modal isOpen={view === 'guide'} onClose={() => setView('home')} title="Scoring Matrix User Guide" size="lg">
            <div className="space-y-4 text-gray-700">
                <p>Welcome to the People's Committee Scoring Matrix. This guide will walk you through the process of scoring applications.</p>
                
                <div>
                    <h4 className="font-bold text-brand-purple font-dynapuff">Step 1: Select Application</h4>
                    <p className="text-sm">Choose an application from the "Outstanding Tasks" list or the main dashboard.</p>
                </div>

                <div>
                    <h4 className="font-bold text-brand-purple font-dynapuff">Step 2: Review & Score</h4>
                    <ul className="list-disc pl-5 text-sm space-y-1">
                        <li><strong>Read the Application:</strong> The PDF is displayed on the left (or top on mobile).</li>
                        <li><strong>Use Sliders:</strong> For each criterion, slide from 0 to 3. The total score updates automatically.</li>
                        <li><strong>Add Notes:</strong> Use the text box for justification notes (optional but recommended).</li>
                    </ul>
                </div>

                <div>
                    <h4 className="font-bold text-brand-purple font-dynapuff">Step 3: Save & Submit</h4>
                    <p className="text-sm">Click <strong>"Save Draft"</strong> to come back later. When finished, click <strong>"Post Final Score"</strong>. <span className="text-red-500 font-bold">Important: Posted scores cannot be edited.</span></p>
                </div>
            </div>
            <div className="mt-6 pt-4 border-t flex justify-end">
                <Button onClick={() => setView('home')}>Understood</Button>
            </div>
        </Modal>
    );

    // --- PROFILE EDITOR MODAL ---
    const renderProfileEditor = () => (
        <Modal isOpen={view === 'profile'} onClose={() => setView('home')} title="Edit My Profile">
            <form onSubmit={handleSaveProfile} className="space-y-6">
                <div className="flex items-center gap-4 mb-6">
                    <img 
                        src={user.photoUrl || `https://ui-avatars.com/api/?name=${user.displayName}&background=9333ea&color=fff`} 
                        alt="Profile" 
                        className="w-20 h-20 rounded-full border-4 border-purple-100 object-cover"
                    />
                    <div>
                        <Button type="button" size="sm" variant="outline">Change Photo</Button>
                        <p className="text-xs text-gray-400 mt-1">JPG or PNG, max 2MB</p>
                    </div>
                </div>
                
                <Input 
                    label="Display Name" 
                    value={profileData.displayName} 
                    onChange={e => setProfileData({...profileData, displayName: e.target.value})} 
                />
                
                <Input 
                    label="Phone Number" 
                    value={profileData.phone} 
                    onChange={e => setProfileData({...profileData, phone: e.target.value})} 
                    placeholder="07123 456789"
                />

                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2 font-dynapuff">Short Bio</label>
                    <textarea 
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-purple-100 outline-none h-24 resize-none"
                        value={profileData.bio}
                        onChange={e => setProfileData({...profileData, bio: e.target.value})}
                        placeholder="Tell us a little about yourself..."
                    />
                </div>

                <div className="pt-4 flex justify-end gap-2 border-t">
                    <Button type="button" variant="ghost" onClick={() => setView('home')}>Cancel</Button>
                    <Button type="submit">Save Profile</Button>
                </div>
            </form>
        </Modal>
    );

    // --- VIEW: PORTAL HOME ---
    if (view === 'home' || view === 'profile' || view === 'guide') {
        const completedCount = myScores.filter(s => s.isFinal).length;
        const totalCount = apps.length;
        const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

        // Filter apps that need scoring (either no score or draft score)
        const outstandingApps = apps.filter(app => {
            const score = myScores.find(s => s.appId === app.id);
            return !score || !score.isFinal;
        });

        // Apps I have already scored (to show summary)
        const scoredApps = apps.filter(app => {
            const score = myScores.find(s => s.appId === app.id);
            return score && score.isFinal;
        });

        return (
            <div className="max-w-5xl mx-auto py-12 px-4 animate-fade-in relative">
                {/* Top Bar */}
                <div className="absolute top-0 right-4 mt-4 flex gap-2">
                    {isAdmin && (
                        <Button size="sm" variant="outline" onClick={onReturnToAdmin} className="border-red-200 text-red-600 hover:bg-red-50">
                            Exit to Admin
                        </Button>
                    )}
                    <button onClick={() => setView('guide')} className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-full shadow-sm border border-blue-100 hover:bg-blue-100 transition-colors">
                        <span className="text-sm font-bold text-blue-700">User Guide</span>
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-200 text-blue-800 text-xs font-bold">?</span>
                    </button>
                    <button onClick={() => setView('profile')} className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm border border-gray-100 hover:bg-purple-50 transition-colors">
                        <span className="text-sm font-bold text-brand-purple">My Profile</span>
                        <div className="w-2 h-2 rounded-full bg-green-400"></div>
                    </button>
                </div>

                <div className="text-center mb-8 pt-8">
                    <h1 className="text-3xl md:text-4xl font-bold font-dynapuff text-brand-purple mb-2">
                        {isAdmin ? "Admin Scoring Oversight" : "People's Committee Portal"}
                    </h1>
                    <p className="max-w-2xl mx-auto text-gray-600">
                        {isAdmin ? "You are viewing the portal as a Super User. You see all applications from all areas." : `Welcome, ${user.displayName}. Access your tools below.`}
                    </p>
                    <div className="mt-4 inline-flex items-center gap-2 bg-purple-50 px-4 py-2 rounded-full">
                        <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">Assigned Area</span>
                        <span className="text-sm font-bold text-brand-purple">{isAdmin ? "ALL AREAS (Admin)" : user.area}</span>
                    </div>
                </div>

                {/* Progress Section */}
                <div className="mb-8 bg-white p-6 rounded-3xl shadow-sm border border-purple-100">
                    <div className="flex justify-between items-end mb-2">
                        <h3 className="font-bold text-gray-700 font-dynapuff">Your Progress</h3>
                        <span className="text-sm font-bold text-brand-purple">{completedCount} of {totalCount} applications scored</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
                        <div 
                            className="bg-gradient-to-r from-brand-purple to-brand-teal h-full rounded-full transition-all duration-1000 ease-out" 
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                </div>

                <div className="grid md:grid-cols-3 gap-8 mb-12">
                    {/* Scoring Matrix Card */}
                    <div onClick={() => setView('score')} className="bg-white p-8 rounded-3xl shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all cursor-pointer text-center border border-purple-50 group">
                        <div className="w-20 h-20 bg-purple-100 text-brand-purple rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                        </div>
                        <h3 className="text-xl font-bold font-dynapuff text-gray-800 mb-2 group-hover:text-brand-purple">Scoring Matrix</h3>
                        <p className="text-gray-500 text-sm">Assess and score submitted applications.</p>
                    </div>

                    {/* App Viewer Card */}
                    <div onClick={() => setView('viewer')} className="bg-white p-8 rounded-3xl shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all cursor-pointer text-center border border-teal-50 group">
                        <div className="w-20 h-20 bg-teal-100 text-brand-teal rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a4 4 0 014-4h6a4 4 0 014 4v12a4 4 0 01-4 4H7zM10 12h4"></path></svg>
                        </div>
                        <h3 className="text-xl font-bold font-dynapuff text-gray-800 mb-2 group-hover:text-brand-teal">Application Viewer</h3>
                        <p className="text-gray-500 text-sm">Browse applications (Read-only).</p>
                    </div>

                    {/* Docs Hub Card */}
                    <div onClick={() => setView('docs')} className="bg-white p-8 rounded-3xl shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all cursor-pointer text-center border border-blue-50 group">
                        <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                        </div>
                        <h3 className="text-xl font-bold font-dynapuff text-gray-800 mb-2 group-hover:text-blue-600">Documents Hub</h3>
                        <p className="text-gray-500 text-sm">Guidance notes and committee resources.</p>
                    </div>
                </div>

                {/* Outstanding Tasks */}
                <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden mb-8">
                    <div className="p-6 border-b border-gray-100 bg-gray-50">
                        <h3 className="font-bold font-dynapuff text-xl text-gray-800">Outstanding Tasks</h3>
                        <p className="text-sm text-gray-500">Applications requiring your score.</p>
                    </div>
                    <div className="divide-y divide-gray-100">
                        {outstandingApps.length === 0 ? (
                            <div className="p-8 text-center text-gray-400">
                                <p className="font-bold">All caught up!</p>
                                <p className="text-sm">You have scored all assigned applications.</p>
                            </div>
                        ) : (
                            outstandingApps.map(app => {
                                const isDraft = myScores.find(s => s.appId === app.id && !s.isFinal);
                                const stats = getAppStats(app.id);
                                return (
                                    <div key={app.id} className="p-4 hover:bg-purple-50 transition-colors flex justify-between items-center">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-2 h-12 rounded-full ${isDraft ? 'bg-yellow-400' : 'bg-red-400'}`}></div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-xs text-gray-400 font-bold">{app.ref}</span>
                                                    {isDraft && <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-bold uppercase">Draft</span>}
                                                </div>
                                                <h4 className="font-bold text-gray-800">{app.projectTitle}</h4>
                                                <div className="flex items-center gap-3 text-sm text-gray-500">
                                                    <span>{app.applicantName}</span>
                                                    <span className="text-xs bg-gray-100 px-2 rounded text-gray-400">Curr Avg: {stats.avg} ({stats.count} scored)</span>
                                                </div>
                                            </div>
                                        </div>
                                        <Button size="sm" onClick={() => handleStartScoring(app)}>
                                            {isDraft ? 'Resume' : 'Score'}
                                        </Button>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Already Scored Summary (New Feature) */}
                {scoredApps.length > 0 && (
                    <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 bg-gray-50">
                            <h3 className="font-bold font-dynapuff text-xl text-gray-800">Completed Scores</h3>
                            <p className="text-sm text-gray-500">Applications you have finalized.</p>
                        </div>
                        <div className="divide-y divide-gray-100">
                            {scoredApps.map(app => {
                                const myScore = myScores.find(s => s.appId === app.id);
                                const stats = getAppStats(app.id);
                                return (
                                    <div key={app.id} className="p-4 hover:bg-green-50 transition-colors flex justify-between items-center">
                                        <div className="flex items-center gap-4">
                                            <div className="w-2 h-12 rounded-full bg-green-400"></div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-xs text-gray-400 font-bold">{app.ref}</span>
                                                    <Badge variant="green">Complete</Badge>
                                                </div>
                                                <h4 className="font-bold text-gray-800">{app.projectTitle}</h4>
                                                <p className="text-sm text-gray-500">
                                                    You scored: <strong>{Math.round(myScore?.total || 0)}</strong> • Cmte Avg: <strong>{stats.avg}</strong> ({stats.count} members)
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {renderProfileEditor()}
                {renderUserGuide()}
            </div>
        );
    }

    // --- VIEW: DOCUMENTS HUB ---
    if (view === 'docs') {
        return (
            <div className="max-w-5xl mx-auto py-12 px-4 animate-fade-in">
                <Button variant="ghost" onClick={() => setView('home')} className="mb-6">&larr; Back to Portal</Button>
                <h2 className="text-3xl font-bold font-dynapuff text-brand-purple mb-8 text-center">Committee Documents</h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {COMMITTEE_DOCS.map((doc, i) => (
                        <a key={i} href={doc.url} target="_blank" rel="noreferrer" className="block bg-white p-6 rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all border border-gray-100 group">
                            <h3 className="text-lg font-bold font-dynapuff text-gray-800 mb-2 group-hover:text-brand-purple">{doc.title}</h3>
                            <p className="text-gray-500 text-sm mb-4">{doc.desc}</p>
                            <span className="inline-flex items-center text-xs font-bold text-brand-purple bg-purple-50 px-3 py-1 rounded-full group-hover:bg-brand-purple group-hover:text-white transition-colors">
                                Download PDF
                            </span>
                        </a>
                    ))}
                </div>
            </div>
        );
    }

    // --- VIEW: APP VIEWER (Read Only) ---
    if (view === 'viewer') {
        const viewerPdf = activeApp ? (activeApp.stage2PdfUrl || activeApp.pdfUrl) : '';
        return (
            <div className="h-[calc(100vh-80px)] flex flex-col md:flex-row animate-fade-in">
                {/* Sidebar List */}
                <div className="md:w-1/3 bg-white border-r border-gray-200 overflow-y-auto flex flex-col">
                    <div className="p-4 border-b border-gray-100 bg-gray-50">
                        <Button variant="ghost" size="sm" onClick={() => setView('home')} className="mb-2">&larr; Portal</Button>
                        <h3 className="font-bold font-dynapuff text-lg text-gray-800">Applications ({isAdmin ? "All" : user.area})</h3>
                    </div>
                    <div className="flex-1 p-2 space-y-2">
                        {apps.length === 0 ? <p className="p-4 text-sm text-gray-400 text-center">No applications found.</p> : 
                        apps.map(app => {
                            const stats = getAppStats(app.id);
                            return (
                                <div 
                                    key={app.id} 
                                    onClick={() => setActiveApp(app)}
                                    className={`p-4 rounded-xl cursor-pointer transition-all border ${activeApp?.id === app.id ? 'bg-purple-50 border-purple-200 shadow-sm' : 'bg-white border-transparent hover:bg-gray-50'}`}
                                >
                                    <div className="flex justify-between items-start">
                                        <span className="font-bold text-gray-800 text-sm">{app.applicantName}</span>
                                        <span className="text-[10px] font-mono text-gray-400">{app.ref}</span>
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1 line-clamp-1">{app.projectTitle}</div>
                                    <div className="mt-2 flex items-center justify-between">
                                        <Badge>{app.status}</Badge>
                                        <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded">Avg: {stats.avg}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
                {/* Main Preview */}
                <div className="md:w-2/3 bg-gray-100 flex flex-col">
                    {activeApp ? (
                        <iframe src={viewerPdf} className="w-full h-full border-0" title="PDF" />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400">
                            <p>Select an application to view.</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // --- VIEW: SCORING INTERFACE (Split Screen) ---
    if (view === 'score') {
        // If no active app, show list to select
        if (!activeApp) {
            return (
                <div className="max-w-6xl mx-auto py-12 px-4 animate-fade-in">
                    <div className="flex justify-between items-center mb-6">
                        <Button variant="ghost" onClick={() => setView('home')}>&larr; Back to Portal</Button>
                        <Button variant="outline" onClick={() => setView('guide')} className="text-sm">Help / Guide</Button>
                    </div>
                    <h2 className="text-2xl font-bold font-dynapuff text-gray-800 mb-6">Select Application to Score</h2>
                    <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="p-5 font-bold text-gray-500 text-sm uppercase">Ref</th>
                                    <th className="p-5 font-bold text-gray-500 text-sm uppercase">Project</th>
                                    <th className="p-5 font-bold text-gray-500 text-sm uppercase">Applicant</th>
                                    <th className="p-5 font-bold text-gray-500 text-sm uppercase text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {apps.length === 0 ? <tr><td colSpan={4} className="p-8 text-center text-gray-400">No applications found.</td></tr> :
                                apps.map(app => (
                                    <tr key={app.id} className="hover:bg-purple-50 transition-colors">
                                        <td className="p-5 font-mono text-sm text-gray-400 font-bold">{app.ref}</td>
                                        <td className="p-5"><div className="font-bold text-gray-800">{app.projectTitle}</div></td>
                                        <td className="p-5 text-gray-600 text-sm">{app.applicantName}</td>
                                        <td className="p-5 text-right">
                                            {ROLE_PERMISSIONS.committee.canScore && (
                                                <Button size="sm" onClick={() => handleStartScoring(app)}>Score</Button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            );
        }

        const totalScore = Math.round(calculateTotal());
        // Prioritize Stage 2 PDF, fallback to Stage 1
        const scoringPdf = activeApp.stage2PdfUrl || activeApp.pdfUrl;

        return (
            <div className="h-[calc(100vh-80px)] flex flex-col md:flex-row overflow-hidden bg-gray-50 animate-fade-in fixed inset-0 top-20 z-0">
                {/* LEFT: PDF Viewer */}
                <div className="md:w-7/12 h-full flex flex-col border-r border-gray-200 bg-white">
                    <div className="p-3 border-b flex items-center justify-between bg-white z-10">
                        <Button variant="ghost" size="sm" onClick={() => setActiveApp(null)}>&larr; List</Button>
                        <div className="text-center">
                            <h2 className="font-bold text-gray-800 text-sm">{activeApp.projectTitle}</h2>
                            <p className="text-xs text-gray-500">{activeApp.ref} {activeApp.stage2PdfUrl ? '(Stage 2)' : '(Stage 1 EOI)'}</p>
                        </div>
                        <div className="w-16"></div>
                    </div>
                    <div className="flex-1 bg-gray-200 relative">
                        {scoringPdf ? (
                            <iframe src={scoringPdf} className="w-full h-full border-0" title="PDF" />
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-400">No PDF</div>
                        )}
                    </div>
                </div>

                {/* RIGHT: Scoring Matrix */}
                <div className="md:w-5/12 h-full flex flex-col bg-slate-50 shadow-inner relative">
                    <div className="p-4 border-b bg-white flex justify-between items-center z-10 shadow-sm">
                        <div>
                            <h2 className="font-bold font-dynapuff text-brand-purple">Scoring Matrix</h2>
                            {isAdmin && (
                                <div className="flex items-center gap-2 mt-1">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">Threshold:</label>
                                    <input 
                                        type="number" 
                                        value={threshold} 
                                        onChange={(e) => setThreshold(Number(e.target.value))}
                                        className="w-12 h-6 text-xs border rounded px-1"
                                    />
                                </div>
                            )}
                        </div>
                        <span className={`px-4 py-1.5 rounded-full font-bold text-base border ${getRag(totalScore)}`}>
                            {totalScore} / 100
                        </span>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 scroller">
                        {SCORING_CRITERIA.map(c => (
                            <div key={c.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:border-purple-300 transition-colors relative">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="pr-8">
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-bold text-gray-800 text-sm">{c.name}</h4>
                                            <button className="text-gray-400 hover:text-brand-purple" onClick={() => setActiveTooltip(activeTooltip === c.id ? null : c.id)}>
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                            </button>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">{c.guidance}</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="w-8 h-8 rounded bg-gray-50 flex items-center justify-center font-bold text-brand-purple border border-gray-200 text-sm">{scores[c.id] || 0}</div>
                                        <span className="text-[9px] text-gray-400 font-bold">Wt: {c.weight}</span>
                                    </div>
                                </div>

                                {activeTooltip === c.id && (
                                    <div className="bg-gray-800 text-white text-xs p-3 rounded-lg shadow-xl mb-3 animate-fade-in">
                                        <div dangerouslySetInnerHTML={{ __html: c.details }} />
                                    </div>
                                )}
                                
                                <div className="mb-4">
                                    <input 
                                        type="range" min="0" max="3" step="1" 
                                        className="w-full accent-brand-purple h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                        value={scores[c.id] || 0}
                                        onChange={(e) => setScores({...scores, [c.id]: Number(e.target.value)})}
                                    />
                                    <div className="flex justify-between text-[10px] text-gray-400 font-bold mt-1 uppercase">
                                        <span>0</span><span>1</span><span>2</span><span>3</span>
                                    </div>
                                </div>

                                <textarea 
                                    placeholder="Justification note..." 
                                    className="w-full text-sm p-3 border border-gray-200 rounded-lg h-16 focus:ring-2 focus:ring-purple-100 outline-none resize-none bg-gray-50 focus:bg-white"
                                    value={notes[c.id] || ''}
                                    onChange={(e) => setNotes({...notes, [c.id]: e.target.value})}
                                />
                            </div>
                        ))}
                        <div className="h-20"></div>
                    </div>

                    <div className="p-4 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                        <div className="flex gap-3">
                            <Button variant="outline" className="flex-1" onClick={() => handleSaveScore(false)}>Save Draft</Button>
                            <Button className="flex-1 shadow-lg py-3" onClick={() => handleSaveScore(true)} disabled={isSaving}>Post Final Score</Button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return null; // Fallback
};

// --- ADMIN DASHBOARD ---
interface AdminProps {
    onNavigatePublic: (view: string) => void;
    onNavigateScoring: () => void;
}

export const AdminDashboard: React.FC<AdminProps> = ({ onNavigatePublic, onNavigateScoring }) => {
    const [allApps, setAllApps] = useState<Application[]>([]);
    const [allScores, setAllScores] = useState<Score[]>([]);
    const [activeTab, setActiveTab] = useState<'overview' | 'tracker' | 'users'>('overview');
    const [areaFilter, setAreaFilter] = useState<string>('All');
    
    const [users, setUsers] = useState<User[]>([]);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [managingApp, setManagingApp] = useState<Application | null>(null);
    const [isCreatingUser, setIsCreatingUser] = useState(false);
    
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstance = useRef<any>(null);

    const refreshData = async () => {
        const apps = await api.getApplications(areaFilter);
        const scores = await api.getScores();
        setAllApps(apps);
        setAllScores(scores);
    };

    useEffect(() => {
        refreshData();
    }, [areaFilter]);

    useEffect(() => {
        api.getUsers().then(setUsers);
    }, []);

    // CSV Export Logic
    const handleExportCSV = () => {
        if (!ROLE_PERMISSIONS.admin.canExport) return;
        
        const headers = ['ID', 'Ref', 'Project Title', 'Organization', 'Applicant', 'Area', 'Status', 'Requested', 'Total Cost', 'Avg Score', 'Num Scores'];
        const rows = allApps.map(app => {
            const appScores = allScores.filter(s => s.appId === app.id && s.isFinal);
            const avg = appScores.length ? (appScores.reduce((a, b) => a + b.total, 0) / appScores.length).toFixed(1) : '0.0';
            
            return [
                app.id,
                app.ref,
                `"${app.projectTitle.replace(/"/g, '""')}"`, // Escape CSV quotes
                `"${app.orgName.replace(/"/g, '""')}"`,
                `"${app.applicantName.replace(/"/g, '""')}"`,
                app.area,
                app.status,
                app.amountRequested,
                app.totalCost,
                avg,
                appScores.length
            ].join(',');
        });

        const csvContent = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", `applications_export_${new Date().toISOString().slice(0,10)}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    // Chart.js Integration
    useEffect(() => {
        if (activeTab === 'overview' && chartRef.current) {
            if (chartInstance.current) chartInstance.current.destroy();
            
            const areas = ['Blaenavon', 'Thornhill & Upper Cwmbran', 'Trevethin, Penygarn & St. Cadocs'];
            const scoreData = areas.map(area => {
                const areaApps = allApps.filter(a => a.area === area).map(a => a.id);
                const areaScores = allScores.filter(s => areaApps.includes(s.appId)).map(s => s.total);
                return areaScores.length ? (areaScores.reduce((a, b) => a + b, 0) / areaScores.length) : 0;
            });

            chartInstance.current = new Chart(chartRef.current, {
                type: 'bar',
                data: {
                    labels: ['Blaenavon', 'Thornhill', 'Trevethin'],
                    datasets: [{
                        label: 'Avg. Committee Score',
                        data: scoreData,
                        backgroundColor: ['rgba(147, 51, 234, 0.7)', 'rgba(20, 184, 166, 0.7)', 'rgba(236, 72, 153, 0.7)'],
                        borderWidth: 0,
                        borderRadius: 8
                    }]
                },
                options: {
                    responsive: true,
                    plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true, max: 100 } }
                }
            });
        }
        return () => { if(chartInstance.current) chartInstance.current.destroy(); };
    }, [activeTab, allApps, allScores]);

    // CRUD Handlers
    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        // In a real app, you'd pass the form data here
        // We will just simulate it with a preset for now or bind form fields
        setIsCreatingUser(false);
        alert("User creation logic would run here. (Implemented in service)");
        api.getUsers().then(setUsers);
    };

    const handleDeleteApp = async (id: string) => {
        if (!ROLE_PERMISSIONS.admin.canManage) return;
        if(confirm("Delete this application AND all associated scores? This cannot be undone.")) {
            await api.deleteApplication(id);
            setManagingApp(null);
            refreshData();
        }
    };

    const handleResetScores = async (appId: string) => {
        if (!ROLE_PERMISSIONS.admin.canManage) return;
        if(confirm("Reset all scores for this application?")) {
            // In a real scenario, we'd filter scores by appId and delete them
            const appScores = allScores.filter(s => s.appId === appId);
            for (const score of appScores) {
                await api.deleteScore(appId, score.scorerId);
            }
            refreshData();
            alert("Scores reset.");
        }
    };

    const handleUpdateApp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (managingApp && ROLE_PERMISSIONS.admin.canManage) {
            await api.updateApplication(managingApp.id, managingApp);
            setManagingApp(null);
            refreshData();
        }
    };

    return (
        <div className="max-w-7xl mx-auto py-12 px-4">
             <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
                <div>
                    <h1 className="text-4xl font-bold font-dynapuff text-brand-purple">Admin Control Room</h1>
                    <div className="flex gap-3 mt-2">
                        <Button size="sm" variant="outline" onClick={() => onNavigatePublic('home')}>Public Site</Button>
                        <Button size="sm" variant="secondary" onClick={onNavigateScoring}>Scoring Portal</Button>
                    </div>
                </div>
                <div className="flex gap-4">
                    {ROLE_PERMISSIONS.admin.canExport && (
                         <Button onClick={handleExportCSV} className="shadow-lg bg-green-600 hover:bg-green-700 shadow-green-200">
                            Download CSV
                         </Button>
                    )}
                    <div className="bg-white p-1.5 rounded-xl border shadow-sm flex">
                        {['overview', 'tracker', 'users'].map(tab => (
                            <button 
                                key={tab}
                                onClick={() => setActiveTab(tab as any)} 
                                className={`px-6 py-2 rounded-lg text-sm font-bold capitalize transition-all ${activeTab === tab ? 'bg-brand-purple text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* TAB: OVERVIEW */}
            {activeTab === 'overview' && (
                <div className="animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <Card className="bg-gradient-to-br from-purple-500 to-purple-700 text-white border-none">
                            <div className="text-3xl font-bold font-dynapuff">{allApps.length}</div>
                            <div className="text-xs font-bold opacity-80 uppercase tracking-widest">Applications</div>
                        </Card>
                        <Card className="bg-gradient-to-br from-teal-500 to-teal-700 text-white border-none">
                            <div className="text-3xl font-bold font-dynapuff">£{(allApps.reduce((a,b) => a + b.amountRequested, 0)/1000).toFixed(1)}k</div>
                            <div className="text-xs font-bold opacity-80 uppercase tracking-widest">Funds Requested</div>
                        </Card>
                        <Card className="bg-gradient-to-br from-blue-500 to-blue-700 text-white border-none">
                            <div className="text-3xl font-bold font-dynapuff">{allScores.filter(s => s.isFinal).length}</div>
                            <div className="text-xs font-bold opacity-80 uppercase tracking-widest">Scores Committed</div>
                        </Card>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-8">
                        <Card className="h-96 flex flex-col">
                            <h3 className="font-bold text-gray-700 mb-4">Average Scores by Area</h3>
                            <div className="flex-1 relative w-full h-full">
                                <canvas ref={chartRef}></canvas>
                            </div>
                        </Card>
                        <Card>
                            <h3 className="font-bold text-gray-700 mb-4">Recent Activity</h3>
                            <div className="space-y-3">
                                {allScores.slice(0, 5).map((s, i) => (
                                    <div key={i} className="flex justify-between items-center text-sm p-2 bg-gray-50 rounded-lg">
                                        <div>
                                            <span className="font-bold text-brand-purple">{s.scorerName}</span> scored
                                            <span className="font-bold text-gray-700 ml-1">{allApps.find(a => a.id === s.appId)?.ref}</span>
                                        </div>
                                        <span className="text-gray-400 text-xs">{new Date(s.timestamp).toLocaleDateString()}</span>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>
                </div>
            )}

            {/* TAB: TRACKER */}
            {activeTab === 'tracker' && (
                <div className="animate-fade-in">
                    <div className="flex justify-between items-center mb-6">
                        <div className="w-64">
                            <select 
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm"
                                value={areaFilter}
                                onChange={(e) => setAreaFilter(e.target.value)}
                            >
                                <option value="All">Filter: All Areas</option>
                                {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                            </select>
                        </div>
                    </div>

                    <Card className="overflow-hidden border-0 shadow-2xl rounded-3xl">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="p-5 font-bold text-gray-500 uppercase tracking-wider text-xs">Ref</th>
                                    <th className="p-5 font-bold text-gray-500 uppercase tracking-wider text-xs">Title</th>
                                    <th className="p-5 font-bold text-gray-500 uppercase tracking-wider text-xs">Area</th>
                                    <th className="p-5 font-bold text-gray-500 uppercase tracking-wider text-xs">Status</th>
                                    <th className="p-5 font-bold text-gray-500 uppercase tracking-wider text-xs">Scores</th>
                                    <th className="p-5 font-bold text-gray-500 uppercase tracking-wider text-xs text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {allApps.map(app => {
                                    const appScores = allScores.filter(s => s.appId === app.id);
                                    const avg = appScores.length ? (appScores.reduce((a,b) => a + b.total, 0) / appScores.length).toFixed(1) : '0.0';
                                    return (
                                        <tr key={app.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="p-5 font-mono text-gray-400 font-bold">{app.ref}</td>
                                            <td className="p-5 font-bold text-gray-800">{app.projectTitle}</td>
                                            <td className="p-5 text-gray-600">{app.area}</td>
                                            <td className="p-5"><Badge>{app.status}</Badge></td>
                                            <td className="p-5 text-gray-600 font-bold">{appScores.length} <span className="text-gray-400 font-normal text-xs">({avg} avg)</span></td>
                                            <td className="p-5 text-right">
                                                <Button size="sm" variant="ghost" onClick={() => setManagingApp(app)}>Manage</Button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </Card>
                </div>
            )}

            {/* TAB: USER MANAGEMENT */}
            {activeTab === 'users' && (
                <div className="animate-fade-in">
                    <div className="flex justify-end mb-6">
                        <Button onClick={() => setIsCreatingUser(true)}>+ Create New User</Button>
                    </div>
                    <Card className="overflow-hidden border-0 shadow-2xl rounded-3xl">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-white border-b border-gray-100">
                                    <tr>
                                        <th className="p-5 text-gray-400 font-bold text-xs uppercase tracking-wider">User</th>
                                        <th className="p-5 text-gray-400 font-bold text-xs uppercase tracking-wider">Role</th>
                                        <th className="p-5 text-gray-400 font-bold text-xs uppercase tracking-wider">Area</th>
                                        <th className="p-5 text-gray-400 font-bold text-xs uppercase tracking-wider text-right">Manage</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {users.map(u => (
                                        <tr key={u.uid} className="hover:bg-gray-50 transition-colors">
                                            <td className="p-5 font-bold text-gray-800">{u.displayName || u.email}</td>
                                            <td className="p-5"><Badge>{u.role}</Badge></td>
                                            <td className="p-5 text-gray-600">{u.area || '-'}</td>
                                            <td className="p-5 text-right">
                                                <button onClick={() => setEditingUser(u)} className="text-blue-600 font-bold text-xs uppercase hover:underline">Edit</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}

            {/* MANAGE APPLICATION MODAL */}
            <Modal isOpen={!!managingApp} onClose={() => setManagingApp(null)} title="Manage Application">
                {managingApp && (
                    <form onSubmit={handleUpdateApp} className="space-y-6">
                        <div className="p-4 bg-purple-50 border border-purple-100 rounded-xl">
                            <h3 className="font-bold text-brand-purple text-lg">{managingApp.projectTitle}</h3>
                            <p className="text-sm text-gray-600">{managingApp.ref} • {managingApp.applicantName}</p>
                        </div>

                        <Input label="Project Title" value={managingApp.projectTitle} onChange={e => setManagingApp({...managingApp, projectTitle: e.target.value})} />
                        
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2 font-dynapuff">Status</label>
                            <select 
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white"
                                value={managingApp.status} 
                                onChange={(e) => setManagingApp({...managingApp, status: e.target.value as any})}
                            >
                                <optgroup label="Stage 1: EOI">
                                    <option value="Submitted-Stage1">Submitted (EOI)</option>
                                    <option value="Rejected-Stage1">Rejected (EOI)</option>
                                </optgroup>
                                <optgroup label="Stage 2: Full App">
                                    <option value="Invited-Stage2">Invited to Stage 2</option>
                                    <option value="Submitted-Stage2">Submitted (Stage 2)</option>
                                    <option value="Finalist">Finalist</option>
                                </optgroup>
                                <optgroup label="Outcome">
                                    <option value="Funded">Funded</option>
                                    <option value="Rejected">Rejected</option>
                                </optgroup>
                            </select>
                        </div>

                        <div className="border-t pt-6 mt-6">
                            <h4 className="font-bold text-red-600 mb-4">Danger Zone</h4>
                            <div className="flex gap-3">
                                <Button type="button" variant="danger" onClick={() => handleResetScores(managingApp.id)} className="flex-1 text-xs">Reset Scores</Button>
                                <Button type="button" variant="danger" onClick={() => handleDeleteApp(managingApp.id)} className="flex-1 text-xs">Delete App</Button>
                            </div>
                        </div>

                        <div className="pt-4 flex justify-end gap-2 border-t">
                            <Button type="button" variant="ghost" onClick={() => setManagingApp(null)}>Cancel</Button>
                            <Button type="submit">Save Changes</Button>
                        </div>
                    </form>
                )}
            </Modal>

            {/* CREATE USER MODAL (Simplified for demo) */}
            <Modal isOpen={isCreatingUser} onClose={() => setIsCreatingUser(false)} title="Create New User">
                <form onSubmit={handleCreateUser} className="space-y-6">
                    <p className="text-sm text-gray-500 bg-blue-50 p-3 rounded-lg">
                        Admins can manually provision accounts for committee members or staff.
                    </p>
                    <Input label="Email Address" placeholder="user@torfaen.gov.uk" />
                    <Input label="Initial Password" type="password" placeholder="••••••" />
                    <div className="pt-4 flex justify-end gap-2 border-t">
                        <Button type="button" variant="ghost" onClick={() => setIsCreatingUser(false)}>Cancel</Button>
                        <Button type="submit">Create User</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};
