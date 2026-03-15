import { supabase } from './supabase';
import { User, Questionnaire, FeedbackEntry, FeedbackResponse, Nomination, AIAnalysis, SystemMessage } from '../types';
import { slackService } from './slackService';

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

    // --- Slack Notification: Notify Recipient ---
    try {
      const { data: receiver } = await supabase.from('profiles').select('email').eq('id', entry.toUserId).single();
      if (receiver?.email) {
        // Find title for context
        const { data: questionnaire } = await supabase.from('questionnaires').select('title').eq('id', entry.questionnaireId).single();
        await slackService.notifyUserOfNewFeedback(receiver.email, questionnaire?.title || '360 評量');
      }
    } catch (e) {
      console.warn("Slack notification failed", e);
    }

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

    // --- Slack Notification: Notify Manager ---
    try {
      const { data: requester } = await supabase.from('profiles').select('name').eq('id', n.requesterId).single();
      await slackService.notifyManagerOfNomination(n.managerId, requester?.name || '同仁', n.title || '360 評量');
    } catch (e) {
      console.warn("Slack notification failed", e);
    }
  },

  async updateNomination(id: string, updates: Partial<Nomination>): Promise<void> {
    const payload: any = {};
    if (updates.status) payload.status = updates.status;
    if (updates.reviewerIds) payload.reviewer_ids = updates.reviewerIds;
    if (updates.managerId) payload.manager_email = updates.managerId;

    const { error } = await supabase.from('nominations').update(payload).eq('id', id);
    if (error) throw error;

    // --- Slack Notification: Notify Reviewers if Approved ---
    if (updates.status === 'Approved') {
      try {
        const { data: nom } = await supabase.from('nominations').select('reviewer_ids, title, requester_id').eq('id', id).single();
        if (nom && nom.reviewer_ids && nom.reviewer_ids.length > 0) {
          const { data: reviewers } = await supabase.from('profiles').select('email').in('id', nom.reviewer_ids);
          const { data: requester } = await supabase.from('profiles').select('name').eq('id', nom.requester_id).single();
          
          if (reviewers) {
            for (const reviewer of reviewers) {
              if (reviewer.email) {
                await slackService.notifyReviewerOfNewTask(reviewer.email, requester?.name || '同仁', nom.title || '360 評量');
              }
            }
          }
        }
      } catch (e) {
        console.warn("Slack notification failed", e);
      }
    }
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
  },

  /**
   * 批次發送 Slack 提醒 (自動化)
   * 檢查是否有：
   * 1. 待審核的提名 (提醒主管)
   * 2. 即將到期且未完成的評量 (提醒評量者)
   * 
   * 配合 localStorage 確保不會過於頻繁發送 (預設 7 天一次)
   */
  async checkAndSendBatchReminders(): Promise<void> {
    const LAST_REMINDER_KEY = 'choco360_last_slack_reminder';
    const REMINDER_DAYS = Number(import.meta.env.VITE_SLACK_REMINDER_DAYS || 7);
    
    const lastReminder = localStorage.getItem(LAST_REMINDER_KEY);
    const now = new Date();
    
    if (lastReminder) {
      const lastDate = new Date(lastReminder);
      const diffTime = Math.abs(now.getTime() - lastDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays < REMINDER_DAYS) {
        console.log(`[Slack] Skipping reminders. Last sent ${diffDays} days ago. (Interval: ${REMINDER_DAYS} days)`);
        return;
      }
    }

    console.group('🚀 [Slack Automatic Reminder] Starting batch process...');
    try {
      // 1. 取得所有進行中的提名
      const { data: nominations } = await supabase
        .from('nominations')
        .select('*')
        .or('status.eq.Pending,status.eq.Approved');

      if (!nominations || nominations.length === 0) {
        console.log('No active nominations found.');
        console.groupEnd();
        return;
      }

      const { data: feedback } = await supabase.from('feedbacks').select('nomination_id, from_user_id');
      const finishedSet = new Set((feedback || []).map(f => `${f.nomination_id}-${f.from_user_id}`));
      
      const managerReminders: Record<string, { requesterId: string; title: string }[]> = {};
      const reviewerReminders: Record<string, { requesterId: string; title: string }[]> = {};
      const profilesToFetch = new Set<string>();

      for (const n of nominations) {
        if (n.status === 'Pending') {
          // 主管審核提醒
          if (!managerReminders[n.manager_email]) managerReminders[n.manager_email] = [];
          managerReminders[n.manager_email].push({ requesterId: n.requester_id, title: n.title });
          profilesToFetch.add(n.requester_id);
        } else if (n.status === 'Approved') {
          // 評量者填寫提醒 (檢查是否快到期)
          const dueDate = n.due_date ? new Date(n.due_date) : null;
          const oneMonthFromNow = new Date();
          oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);

          if (!dueDate || dueDate <= oneMonthFromNow) {
            for (const reviewerId of n.reviewer_ids) {
              if (!finishedSet.has(`${n.id}-${reviewerId}`)) {
                if (!reviewerReminders[reviewerId]) reviewerReminders[reviewerId] = [];
                reviewerReminders[reviewerId].push({ requesterId: n.requester_id, title: n.title });
                profilesToFetch.add(reviewerId);
                profilesToFetch.add(n.requester_id);
              }
            }
          }
        }
      }

      // 取得所有相關姓名
      const { data: profiles } = await supabase.from('profiles').select('id, name, email').in('id', Array.from(profilesToFetch));
      const profileMap = (profiles || []).reduce((acc: any, p) => ({ ...acc, [p.id]: p }), {});

      // 發送主管提醒
      for (const managerEmail in managerReminders) {
        const items = managerReminders[managerEmail];
        const requesterName = profileMap[items[0].requesterId]?.name || '同仁';
        await slackService.notifyManagerOfNomination(managerEmail, requesterName, items[0].title);
      }

      // 發送評量者提醒
      for (const reviewerId in reviewerReminders) {
        const reviewer = profileMap[reviewerId];
        if (!reviewer?.email) continue;
        
        const tasks = reviewerReminders[reviewerId].map(t => ({
          requesterName: profileMap[t.requesterId]?.name || '同仁',
          title: t.title
        }));
        await slackService.notifyReviewerOfPendingTasks(reviewer.email, tasks.length, tasks);
      }

      localStorage.setItem(LAST_REMINDER_KEY, now.toISOString());
      console.log('[Slack] All batch reminders sent successfully.');
    } catch (e) {
      console.error('[Slack] Failed to process batch reminders', e);
    }
    console.groupEnd();
  }
};
