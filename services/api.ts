
import { supabase } from './supabase';
import { User, Questionnaire, FeedbackEntry, FeedbackResponse, Nomination, AIAnalysis, SystemMessage } from '../types';

const ALLOWED_DOMAIN = '@choco.media';
const STORAGE_KEY = 'nexus360_user_email';

export const api = {
  // --- Auth ---
  async login(email: string): Promise<User> {
    const cleanEmail = email.toLowerCase().trim();
    if (!cleanEmail.endsWith(ALLOWED_DOMAIN)) {
      throw new Error('登入失敗，請確認您使用的是受信任的企業帳號。');
    }

    const { data: existing, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (!existing) {
      throw new Error('找不到您的帳號。請聯繫 HR 或系統管理員為您開通權限後再試。');
    }

    await supabase.from('profiles').update({
      updated_at: new Date().toISOString()
    }).eq('id', existing.id);

    localStorage.setItem(STORAGE_KEY, cleanEmail);

    return { 
      id: existing.id, 
      name: existing.name, 
      email: existing.email, 
      role: existing.role, 
      department: existing.department, 
      avatar: existing.avatar,
      isSystemAdmin: existing.is_system_admin, 
      isManager: existing.is_manager, 
      managerEmail: existing.manager_email 
    } as User;
  },

  async getCurrentUser(): Promise<User | null> {
    const savedEmail = localStorage.getItem(STORAGE_KEY);
    if (!savedEmail) return null;
    try { 
      return await this.login(savedEmail); 
    } catch (err) { 
      console.warn("Auto login failed", err);
      return null; 
    }
  },

  async logout() { 
    localStorage.removeItem(STORAGE_KEY); 
  },

  async getUsers(): Promise<User[]> {
    const { data } = await supabase.from('profiles').select('*').order('name');
    return (data || []).map(u => ({
      id: u.id, name: u.name, email: u.email, role: u.role, department: u.department,
      avatar: u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.email}`,
      isSystemAdmin: u.is_system_admin, 
      isManager: u.is_manager, 
      managerEmail: u.manager_email
    }));
  },

  async updateUser(user: Partial<User>): Promise<User> {
    const isNew = !user.id || user.id.length < 30;
    
    const payload: any = {
      name: user.name, 
      email: user.email,
      role: user.role, 
      department: user.department,
      avatar: user.avatar, 
      is_system_admin: user.isSystemAdmin, 
      is_manager: user.isManager, 
      manager_email: user.managerEmail,
      updated_at: new Date().toISOString()
    };

    let result;
    if (isNew) {
      result = await supabase.from('profiles').insert(payload).select().single();
    } else {
      result = await supabase.from('profiles').update(payload).eq('id', user.id).select().single();
    }

    if (result.error) {
      throw new Error(result.error.message);
    }

    const u = result.data;
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      department: u.department,
      avatar: u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.email}`,
      isSystemAdmin: u.is_system_admin,
      isManager: u.is_manager,
      managerEmail: u.manager_email
    };
  },

  async updateAvatar(userId: string, avatarUrl: string): Promise<void> {
    const { error } = await supabase.from('profiles').update({ avatar: avatarUrl }).eq('id', userId);
    if (error) throw error;
  },

  async deleteUser(userId: string): Promise<void> {
    const { error } = await supabase.from('profiles').delete().eq('id', userId);
    if (error) throw error;
  },

  // --- System Messages ---
  async getSystemMessages(): Promise<SystemMessage[]> {
    const { data, error } = await supabase
      .from('system_messages')
      .select('*, profiles(name, avatar)')
      .order('created_at', { ascending: false });
    
    if (error) return [];
    return data.map((m: any) => ({
      id: m.id,
      userId: m.user_id,
      userName: m.profiles?.name || '未知使用者',
      userAvatar: m.profiles?.avatar || '',
      content: m.content,
      createdAt: m.created_at
    }));
  },

  async postSystemMessage(userId: string, content: string): Promise<void> {
    const { error } = await supabase.from('system_messages').insert({
      user_id: userId,
      content: content
    });
    if (error) throw error;
  },

  // --- Questionnaires ---
  async getQuestionnaires(): Promise<Questionnaire[]> {
    const { data, error } = await supabase
      .from('questionnaires')
      .select('*, dimensions(*, questions(*))')
      .order('created_at', { ascending: true });
    
    if (error) return [];
    
    return data.map(q => ({
      id: q.id, 
      title: q.title, 
      description: q.description, 
      active: q.active, 
      createdAt: q.created_at,
      dimensions: (q.dimensions || []).map((d: any) => ({
        id: d.id, 
        name: d.name, 
        purpose: d.purpose,
        questions: (d.questions || []).map((qu: any) => ({ 
          id: qu.id, 
          text: qu.text, 
          type: (qu.question_type as any) || 'rating' 
        }))
      }))
    }));
  },

  async upsertQuestionnaire(q: Partial<Questionnaire>): Promise<void> {
    const { data: qData, error: qError } = await supabase.from('questionnaires').upsert({
      id: q.id && q.id.length > 30 ? q.id : undefined,
      title: q.title, 
      description: q.description, 
      active: q.active ?? true
    }).select().single();
    
    if (qError) throw qError;

    if (q.dimensions) {
      const { data: oldDimensions } = await supabase.from('dimensions').select('id').eq('questionnaire_id', qData.id);
      if (oldDimensions && oldDimensions.length > 0) {
        const oldDimIds = oldDimensions.map(d => d.id);
        await supabase.from('questions').delete().in('dimension_id', oldDimIds);
      }
      await supabase.from('dimensions').delete().eq('questionnaire_id', qData.id);

      for (const dim of q.dimensions) {
        const { data: dData, error: dError } = await supabase.from('dimensions').insert({
          questionnaire_id: qData.id, 
          name: dim.name, 
          purpose: dim.purpose
        }).select().single();
        
        if (dError) throw dError;

        if (dData && dim.questions && dim.questions.length > 0) {
          const { error: quError } = await supabase.from('questions').insert(dim.questions.map(qu => ({
            dimension_id: dData.id, 
            text: qu.text, 
            question_type: qu.type || 'rating'
          })));
          if (quError) throw quError;
        }
      }
    }
  },

  // --- Feedbacks ---
  async submitFeedback(entry: FeedbackEntry): Promise<void> {
    const { data: fbData, error: fbError } = await supabase.from('feedbacks').insert({
      from_user_id: entry.fromUserId, 
      to_user_id: entry.toUserId,
      questionnaire_id: entry.questionnaireId,
      nomination_id: entry.nominationId,
      stop_comments: entry.stopComments || '',
      start_comments: entry.startComments || '',
      continue_comments: entry.continueComments || ''
    }).select().single();
    
    if (fbError) throw fbError;

    if (entry.responses && entry.responses.length > 0) {
      const { error: resError } = await supabase.from('feedback_responses').insert(entry.responses.map(r => ({
        feedback_id: fbData.id, 
        question_id: r.questionId,
        score: r.score, 
        answer_text: r.answerText, 
        dimension_name: r.dimensionName
      })));
      
      if (resError) throw resError;
    }
  },

  async getAllFeedbacks(): Promise<FeedbackEntry[]> {
    const { data } = await supabase.from('feedbacks').select('*, feedback_responses(*)');
    return (data || []).map(f => ({
      id: f.id, 
      fromUserId: f.from_user_id, 
      toUserId: f.to_user_id,
      questionnaireId: f.questionnaire_id,
      nominationId: f.nomination_id,
      stopComments: f.stop_comments,
      startComments: f.start_comments,
      continueComments: f.continue_comments,
      responses: (f.feedback_responses || []).map((r: any) => ({
        questionId: r.question_id, 
        score: r.score, 
        answerText: r.answer_text, 
        dimensionName: r.dimension_name
      })), 
      timestamp: f.created_at
    })) as FeedbackEntry[];
  },

  async getFeedbacksForUser(userId: string): Promise<FeedbackEntry[]> {
    const { data } = await supabase.from('feedbacks').select('*, feedback_responses(*)').eq('to_user_id', userId);
    return (data || []).map(f => ({
      id: f.id, 
      fromUserId: f.from_user_id, 
      toUserId: f.to_user_id,
      questionnaireId: f.questionnaire_id,
      nominationId: f.nomination_id,
      stopComments: f.stop_comments,
      startComments: f.start_comments,
      continueComments: f.continue_comments,
      responses: (f.feedback_responses || []).map((r: any) => ({
        questionId: r.question_id, 
        score: r.score, 
        answerText: r.answer_text, 
        dimensionName: r.dimension_name
      })), 
      timestamp: f.created_at
    })) as FeedbackEntry[];
  },

  // --- Nominations ---
  async getAllNominations(): Promise<Nomination[]> {
    const { data } = await supabase.from('nominations').select('*').order('created_at', { ascending: false });
    return (data || []).map(n => ({
      id: n.id, 
      requesterId: n.requester_id, 
      reviewerIds: n.reviewer_ids,
      status: n.status, 
      managerId: n.manager_email, 
      title: n.title,
      questionnaireId: n.questionnaire_id, 
      dueDate: n.due_date, 
      createdAt: n.created_at,
      aiAnalysis: n.ai_analysis, 
      analysisFeedbackCount: n.analysis_feedback_count
    }));
  },

  async getNominationsByRequester(userId: string): Promise<Nomination[]> {
    const { data } = await supabase.from('nominations').select('*').eq('requester_id', userId).order('created_at', { ascending: false });
    return (data || []).map(n => ({
      id: n.id, 
      requesterId: n.requester_id, 
      reviewerIds: n.reviewer_ids,
      status: n.status, 
      managerId: n.manager_email, 
      title: n.title,
      questionnaireId: n.questionnaire_id, 
      dueDate: n.due_date, 
      createdAt: n.created_at,
      aiAnalysis: n.ai_analysis, 
      analysisFeedbackCount: n.analysis_feedback_count
    }));
  },

  async getNominationsForManager(email: string): Promise<Nomination[]> {
    const { data } = await supabase.from('nominations').select('*').eq('manager_email', email);
    return (data || []).map(n => ({
      id: n.id, 
      requesterId: n.requester_id, 
      reviewerIds: n.reviewer_ids,
      status: n.status, 
      managerId: n.manager_email, 
      title: n.title,
      questionnaireId: n.questionnaire_id, 
      dueDate: n.due_date, 
      createdAt: n.created_at
    }));
  },

  async getNominationTasks(userId: string): Promise<Nomination[]> {
    const { data } = await supabase.from('nominations')
      .select('*')
      .eq('status', 'Approved')
      .or(`reviewer_ids.cs.{${userId}},requester_id.eq.${userId}`);

    if (!data) return [];

    const { data: existingFeedbacks } = await supabase.from('feedbacks')
      .select('nomination_id')
      .eq('from_user_id', userId);
    
    const finishedNominationIds = new Set((existingFeedbacks || []).map(f => f.nomination_id));
    
    return data
      .filter(n => !finishedNominationIds.has(n.id))
      .map(n => ({
        id: n.id, 
        requesterId: n.requester_id, 
        reviewerIds: n.reviewer_ids,
        status: n.status, 
        managerId: n.manager_email, 
        title: n.title,
        questionnaireId: n.questionnaire_id, 
        dueDate: n.due_date, 
        createdAt: n.created_at
      }));
  },

  async saveNomination(n: any): Promise<void> {
    const { error } = await supabase.from('nominations').insert({
      requester_id: n.requesterId, 
      reviewer_ids: n.reviewerIds,
      status: n.status, 
      manager_email: n.managerId, 
      title: n.title,
      questionnaire_id: n.questionnaireId, 
      due_date: n.dueDate
    });
    if (error) throw error;
  },

  async updateNomination(id: string, updates: Partial<Nomination>): Promise<void> {
    const payload: any = {};
    if (updates.status) payload.status = updates.status;
    if (updates.reviewerIds) payload.reviewer_ids = updates.reviewerIds;
    if (updates.managerId) payload.manager_email = updates.managerId;

    const { error } = await supabase.from('nominations').update(payload).eq('id', id);
    if (error) throw error;
  },

  async deleteNomination(id: string): Promise<void> {
    const { error } = await supabase.from('nominations').delete().eq('id', id);
    if (error) throw error;
  },

  async updateNominationAnalysis(id: string, analysis: AIAnalysis, count: number): Promise<void> {
    const { error } = await supabase.from('nominations').update({
      ai_analysis: analysis,
      analysis_feedback_count: count
    }).eq('id', id);
    if (error) throw error;
  }
};
