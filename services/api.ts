import { supabase } from './supabase';
import { User, Questionnaire, FeedbackEntry, FeedbackResponse, Nomination, AIAnalysis, SystemMessage, NotificationLog, PRPRecord, PRPItem } from '../types';
import { slackService } from './slackService';

const ALLOWED_DOMAIN = '@choco.media';
const STORAGE_KEY = 'nexus360_user_email';

export const api = {
  // --- Auth ---
  async loginWithGoogle(): Promise<void> {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) throw error;
  },

  async getCurrentUser(): Promise<User | null> {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) return null;

    const email = session.user.email;
    if (!email) return null;

    const cleanEmail = email.toLowerCase().trim();
    if (!cleanEmail.endsWith(ALLOWED_DOMAIN)) {
      await supabase.auth.signOut();
      throw new Error('登入失敗，請確認您使用的是受信任的企業帳號。');
    }

    const { data: existing, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (fetchError || !existing) {
      await supabase.auth.signOut();
      throw new Error('找不到您的帳號。請聯繫 HR 或系統管理員為您開通權限後再試。');
    }

    if (existing.status === 'resigned') {
      await supabase.auth.signOut();
      throw new Error('您的帳號已停用（離職狀態），無法登入系統。如有疑問請聯繫管理員。');
    }

    await supabase.from('profiles').update({
      updated_at: new Date().toISOString()
    }).eq('id', existing.id);

    return { 
      id: existing.id, 
      name: existing.name, 
      email: existing.email, 
      role: existing.role, 
      department: existing.department, 
      avatar: existing.avatar,
      isSystemAdmin: existing.is_system_admin, 
      isManager: existing.is_manager, 
      managerEmail: existing.manager_email,
      motto: existing.motto,
      unlockedSuperpowers: existing.unlocked_superpowers,
      activeSuperpowerId: existing.active_superpower_id,
      status: existing.status
    } as User;
  },

  async logout(): Promise<void> { 
    await supabase.auth.signOut();
  },

  async getUsers(): Promise<User[]> {
    const { data } = await supabase.from('profiles').select('*').order('name');
    return (data || []).map(u => ({
      id: u.id, name: u.name, email: u.email, role: u.role, department: u.department,
      avatar: u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.email}`,
      isSystemAdmin: u.is_system_admin, 
      isManager: u.is_manager, 
      managerEmail: u.manager_email,
      motto: u.motto,
      unlockedSuperpowers: u.unlocked_superpowers,
      activeSuperpowerId: u.active_superpower_id,
      status: u.status
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
      motto: user.motto,
      unlocked_superpowers: user.unlockedSuperpowers,
      active_superpower_id: user.activeSuperpowerId,
      status: user.status,
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
      managerEmail: u.manager_email,
      motto: u.motto,
      unlockedSuperpowers: u.unlocked_superpowers,
      activeSuperpowerId: u.active_superpower_id,
      status: u.status
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
        const { data: questionnaire } = await supabase.from('questionnaires').select('title').eq('id', entry.questionnaireId).single();
        const title = questionnaire?.title || '360 評量';
        const result = await slackService.notifyUserOfNewFeedback(receiver.email, title);
        await this.logNotification({
          recipientEmail: receiver.email,
          notificationType: '自動推播 - 收到新回饋',
          messageText: `通知收到新回饋: ${title}`,
          status: result ? 'sent' : 'failed',
          errorMessage: result ? undefined : 'Slack notification failed'
        });
      }
    } catch (e: any) {
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
    const { data, error } = await supabase.from('feedbacks').select('*, feedback_responses(*)').eq('to_user_id', userId);
    if (error) console.error('🔴 [API] getFeedbacksForUser ERROR:', error.message, error.code, 'userId:', userId);
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

  async getFeedbacksByNominationIds(nominationIds: string[]): Promise<{ nominationId: string, fromUserId: string }[]> {
    if (!nominationIds || nominationIds.length === 0) return [];
    const { data, error } = await supabase
      .from('feedbacks')
      .select('nomination_id, from_user_id')
      .in('nomination_id', nominationIds);
    if (error) throw error;
    return (data || []).map(d => ({ nominationId: d.nomination_id, fromUserId: d.from_user_id }));
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
    const { data, error } = await supabase.from('nominations').select('*').eq('requester_id', userId).order('created_at', { ascending: false });
    if (error) console.error('🔴 [API] getNominationsByRequester ERROR:', error.message, error.code, 'userId:', userId);
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
      .select('*, requester:profiles!nominations_requester_id_fkey(status)')
      .eq('status', 'Approved')
      .or(`reviewer_ids.cs.{${userId}},requester_id.eq.${userId}`);

    if (!data) return [];

    // 過濾掉發起人已離職的問卷
    const activeData = data.filter((n: any) => n.requester?.status !== 'resigned');

    const { data: existingFeedbacks } = await supabase.from('feedbacks')
      .select('nomination_id')
      .eq('from_user_id', userId);
    
    const finishedNominationIds = new Set((existingFeedbacks || []).map(f => f.nomination_id));
    
    return activeData
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

    // --- Slack Notification: Notify Manager automatically ---
    try {
      const { data: requester, error: reqError } = await supabase.from('profiles').select('name').eq('id', n.requesterId).single();
      if (!reqError) {
        const result = await slackService.notifyManagerOfNomination(n.managerId, requester?.name || '同仁', n.title || '360 評量');
        await this.logNotification({
          recipientEmail: n.managerId,
          notificationType: '自動推播 - 提名待核准',
          messageText: `提醒核准 ${requester?.name || '同仁'} 的 ${n.title || '360 評量'}`,
          status: result ? 'sent' : 'failed',
          errorMessage: result ? undefined : 'Slack notification failed'
        });
      }
    } catch (e: any) {
      console.warn("Slack notification failed", e);
      await this.logNotification({ recipientEmail: n.managerId, notificationType: '自動推播 - 提名待核准', messageText: `提醒核准 ${n.title}`, status: 'failed', errorMessage: e.message });
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
                try {
                  const result = await slackService.notifyReviewerOfNewTask(reviewer.email, requester?.name || '同仁', nom.title || '360 評量');
                  await this.logNotification({
                    recipientEmail: reviewer.email,
                    notificationType: '自動推播 - 新評量任務',
                    messageText: `通知 ${requester?.name || '同仁'} 的新評量任務: ${nom.title || '360 評量'}`,
                    status: result ? 'sent' : 'failed',
                    errorMessage: result ? undefined : 'Slack notification failed'
                  });
                } catch(e: any) {
                  await this.logNotification({ recipientEmail: reviewer.email, notificationType: '自動推播 - 新評量任務', messageText: `通知新評量任務: ${nom.title}`, status: 'failed', errorMessage: e.message });
                }
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

  // --- Notifications (Slack & Logging) ---
  async getNotificationLogs(): Promise<NotificationLog[]> {
    const { data, error } = await supabase.from('notification_logs').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data.map((l: any) => ({
      id: l.id,
      recipientEmail: l.recipient_email,
      notificationType: l.notification_type,
      messageText: l.message_text,
      status: l.status,
      errorMessage: l.error_message,
      createdAt: l.created_at
    }));
  },

  async logNotification(log: NotificationLog): Promise<void> {
    const { error } = await supabase.from('notification_logs').insert({
      recipient_email: log.recipientEmail,
      notification_type: log.notificationType,
      message_text: log.messageText,
      status: log.status,
      error_message: log.errorMessage
    });
    if (error) console.error("Failed to log notification:", error);
  },

  async clearNotificationLogs(): Promise<void> {
    const { error } = await supabase.from('notification_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) throw error;
  },

  /**
   * 手動批次發送 Slack 提醒
   */
  async sendBatchReminders(): Promise<{ sent: number; failed: number }> {
    console.group('🚀 [Slack Manual Batch Reminder] Starting process...');
    let sentCount = 0;
    let failedCount = 0;
    try {
      const { data: nominations } = await supabase.from('nominations').select('*').or('status.eq.Pending,status.eq.Approved');
      if (!nominations || nominations.length === 0) {
        console.log('No active nominations found.');
        console.groupEnd();
        return { sent: 0, failed: 0 };
      }

      const { data: feedback } = await supabase.from('feedbacks').select('nomination_id, from_user_id');
      const finishedSet = new Set((feedback || []).map(f => `${f.nomination_id}-${f.from_user_id}`));
      
      const managerReminders: Record<string, { requesterId: string; title: string }[]> = {};
      const reviewerReminders: Record<string, { requesterId: string; title: string }[]> = {};
      const profilesToFetch = new Set<string>();

      for (const n of nominations) {
        if (n.status === 'Pending') {
          if (!managerReminders[n.manager_email]) managerReminders[n.manager_email] = [];
          managerReminders[n.manager_email].push({ requesterId: n.requester_id, title: n.title });
          profilesToFetch.add(n.requester_id);
        } else if (n.status === 'Approved') {
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

      const { data: profiles } = await supabase.from('profiles').select('id, name, email, status').in('id', Array.from(profilesToFetch));
      const profileMap = (profiles || []).reduce((acc: any, p) => ({ ...acc, [p.id]: p }), {});

      for (const managerEmail in managerReminders) {
        const items = managerReminders[managerEmail];
        const requesterName = profileMap[items[0].requesterId]?.name || '同仁';
        try {
          const result = await slackService.notifyManagerOfNomination(managerEmail, requesterName, items[0].title);
          await this.logNotification({ recipientEmail: managerEmail, notificationType: '批次 - 提名待核准提醒', messageText: `提醒核准 ${requesterName} 的 ${items[0].title}`, status: result ? 'sent' : 'failed', errorMessage: result ? undefined : 'Slack notification failed' });
          if (result) sentCount++; else failedCount++;
        } catch (e: any) {
          await this.logNotification({ recipientEmail: managerEmail, notificationType: '批次 - 提名待核准提醒', messageText: `提醒核准 ${requesterName} 的 ${items[0].title}`, status: 'failed', errorMessage: e.message });
          failedCount++;
        }
      }

      for (const reviewerId in reviewerReminders) {
        const reviewer = profileMap[reviewerId];
        if (!reviewer?.email || reviewer.status === 'resigned') continue;
        
        const tasks = reviewerReminders[reviewerId].map(t => ({ requesterName: profileMap[t.requesterId]?.name || '同仁', title: t.title }));
        try {
          const result = await slackService.notifyReviewerOfPendingTasks(reviewer.email, tasks.length, tasks);
          await this.logNotification({ recipientEmail: reviewer.email, notificationType: '批次 - 待處理任務提醒', messageText: `提醒完成 ${tasks.length} 項評量任務`, status: result ? 'sent' : 'failed', errorMessage: result ? undefined : 'Slack notification failed' });
          if (result) sentCount++; else failedCount++;
        } catch (e: any) {
          await this.logNotification({ recipientEmail: reviewer.email, notificationType: '批次 - 待處理任務提醒', messageText: `提醒完成 ${tasks.length} 項評量任務`, status: 'failed', errorMessage: e.message });
          failedCount++;
        }
      }
      console.log('[Slack] Manual batch reminders process completed.');
    } catch (e) {
      console.error('[Slack] Failed to process batch reminders', e);
      throw e;
    }
    console.groupEnd();
    return { sent: sentCount, failed: failedCount };
  },

  /**
   * 針對單一問卷發送催繳通知
   */
  async sendReminderForNomination(nominationId: string): Promise<{ sent: number; failed: number }> {
    let sentCount = 0;
    let failedCount = 0;
    try {
      const { data: n } = await supabase.from('nominations').select('*').eq('id', nominationId).single();
      if (!n || n.status !== 'Approved') return { sent: 0, failed: 0 };

      const { data: feedback } = await supabase.from('feedbacks').select('from_user_id').eq('nomination_id', nominationId);
      const finishedIds = new Set((feedback || []).map((f: any) => f.from_user_id));
      const missingIds = (n.reviewer_ids || []).filter((id: string) => !finishedIds.has(id));

      if (missingIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, name, email, status').in('id', [...missingIds, n.requester_id]);
        const profileMap = (profiles || []).reduce((acc: any, p: any) => ({ ...acc, [p.id]: p }), {});
        const requesterName = profileMap[n.requester_id]?.name || '同仁';

        for (const reviewerId of missingIds) {
          const reviewer = profileMap[reviewerId];
          if (!reviewer?.email || reviewer.status === 'resigned') continue;
          try {
            const result = await slackService.notifyReviewerOfPendingTasks(reviewer.email, 1, [{ requesterName, title: n.title }]);
            await this.logNotification({ recipientEmail: reviewer.email, notificationType: '手動推播 - 單一問卷催繳', messageText: `提醒完成 1 項評量任務: ${n.title}`, status: result ? 'sent' : 'failed', errorMessage: result ? undefined : 'Slack notification failed' });
            if (result) sentCount++; else failedCount++;
          } catch (e: any) {
            await this.logNotification({ recipientEmail: reviewer.email, notificationType: '手動推播 - 單一問卷催繳', messageText: `提醒完成 1 項評量任務: ${n.title}`, status: 'failed', errorMessage: e.message });
            failedCount++;
          }
        }
      }
    } catch (e) {
      console.error('[Slack] Failed to send reminder for nomination', e);
      throw e;
    }
    return { sent: sentCount, failed: failedCount };
  },

  // --- PRP ---
  async getPRPRecords(userId: string): Promise<PRPRecord[]> {
    const { data, error } = await supabase
      .from('prp_records')
      .select('*, prp_items(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching PRP records:', error);
      return [];
    }
    return (data || []).map((r: any) => {
      const items = (r.prp_items || []).map((i: any) => ({
        id: i.id,
        prpRecordId: i.prp_record_id,
        itemType: i.item_type,
        itemLabel: i.item_label,
        importance: i.importance,
        selfDescription: i.self_description,
        evaluations: i.evaluations || [],
        itemRating: i.item_rating,
        averageScore: i.average_score ?? null,
        sortOrder: i.sort_order || 0
      }));
      // 兜底修正：若所有 items 都沒有 evaluations（純自填格式），
      // 等第欄屬於整份考核，不屬於個別 KPI，清除所有 itemRating
      const hasAnyEvaluations = items.some((i: any) => i.evaluations.length > 0);
      if (!hasAnyEvaluations) items.forEach((i: any) => { i.itemRating = undefined; });
      return {
        id: r.id, userId: r.user_id, period: r.period, department: r.department,
        jobTitle: r.job_title, employeeCode: r.employee_code,
        overallSelfSummary: r.overall_self_summary,
        overallManagerComments: r.overall_manager_comments || [],
        finalRating: r.final_rating, interviewNotes: r.interview_notes,
        source: r.source || 'import', createdAt: r.created_at, items,
      };
    }) as PRPRecord[];
  },

  async savePRPRecord(record: Partial<PRPRecord>, items: Partial<PRPItem>[]): Promise<void> {
    const payloadSize = JSON.stringify(record).length + JSON.stringify(items).length;
    console.log(`💾 [API] Starting PRP save. Payload size: approx ${payloadSize} chars.`);
    console.log("💾 [API] User ID:", record.userId);

    // 強制純量化保護：避免解析資料帶有奇怪的 prototype 或者不可見字元
    const insertPayload = JSON.parse(JSON.stringify({
      user_id: record.userId,
      period: record.period ? String(record.period).trim() : 'Unknown',
      department: record.department ? String(record.department).trim() : null,
      job_title: record.jobTitle ? String(record.jobTitle).trim() : null,
      employee_code: record.employeeCode ? String(record.employeeCode).trim() : null,
      overall_self_summary: record.overallSelfSummary ? String(record.overallSelfSummary) : null,
      overall_manager_comments: Array.isArray(record.overallManagerComments) ? record.overallManagerComments : [],
      final_rating: record.finalRating ? String(record.finalRating).trim() : null,
      interview_notes: record.interviewNotes ? String(record.interviewNotes) : null,
      source: record.source || 'import'
    }));

    console.log("📦 [API] 準備送往資料庫主表的精確 Payload:", insertPayload);

    // 1. 執行主表插入（只回傳 id，避免大型欄位造成 response 過大）
    const { data: rData, error: rError } = await supabase
      .from('prp_records')
      .insert(insertPayload)
      .select('id')
      .single();

    if (rError) {
      console.error("🔴 [API] Error inserting prp_records:", rError);
      throw rError;
    }

    if (!rData?.id) {
      console.error("🔴 [API] No id returned after insert.");
      throw new Error("儲存失敗：無法取得寫入後的紀錄 ID (請確認 RLS 權限)");
    }

    console.log("✅ [API] Record saved, id:", rData.id, ". Now saving items...");

    // 2. 執行明細表插入
    if (items && items.length > 0) {
      const { error: iError } = await supabase.from('prp_items').insert(items.map((i, idx) => ({
        prp_record_id: rData.id,
        item_type: i.itemType,
        item_label: i.itemLabel,
        importance: i.importance,
        self_description: i.selfDescription,
        evaluations: i.evaluations || [],
        item_rating: i.itemRating,
        average_score: i.averageScore ?? null,
        sort_order: i.sortOrder ?? idx
      })));
      
      if (iError) {
        console.error("🔴 [API] Error inserting prp_items:", iError);
        throw iError;
      }
      console.log("✅ [API] All items saved successfully.");
    }
  },

  async updatePRPRecord(
    recordId: string,
    recordUpdates: {
      overallSelfSummary?: string;
      supervisors?: import('../types').PRPSupervisor[];
      overallManagerComments?: import('../types').PRPEvaluation[];
    },
    itemUpdates: { id: string; selfDescription: string; itemLabel: string; evaluations?: import('../types').PRPEvaluation[] }[]
  ): Promise<void> {
    console.log(`✏️ [API] Updating PRP record ${recordId}...`);

    // 1. 更新主表
    const recordPayload: Record<string, any> = {
      overall_self_summary: recordUpdates.overallSelfSummary ?? null,
      supervisors: recordUpdates.supervisors ?? [],
    };
    if (recordUpdates.overallManagerComments !== undefined) {
      recordPayload.overall_manager_comments = recordUpdates.overallManagerComments;
    }

    const { error: rError } = await supabase
      .from('prp_records')
      .update(recordPayload)
      .eq('id', recordId);

    if (rError) {
      console.error('🔴 [API] Error updating prp_records:', rError);
      throw rError;
    }

    // 2. 逐筆更新 prp_items
    for (const item of itemUpdates) {
      if (!item.id) continue;
      const itemPayload: Record<string, any> = {
        self_description: item.selfDescription,
        item_label: item.itemLabel,
      };
      if (item.evaluations !== undefined) {
        itemPayload.evaluations = item.evaluations;
      }
      const { error: iError } = await supabase
        .from('prp_items')
        .update(itemPayload)
        .eq('id', item.id);

      if (iError) {
        console.error(`🔴 [API] Error updating prp_item ${item.id}:`, iError);
        throw iError;
      }
    }

    console.log('✅ [API] PRP record updated successfully.');
  },

  async getAllPRPRecords(): Promise<PRPRecord[]> {
    const { data, error } = await supabase
      .from('prp_records')
      .select('*, prp_items(*)')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching all PRP records:', error);
      return [];
    }

    return (data || []).map((r: any) => ({
      id: r.id,
      userId: r.user_id,
      period: r.period,
      department: r.department,
      jobTitle: r.job_title,
      employeeCode: r.employee_code,
      overallSelfSummary: r.overall_self_summary,
      overallManagerComments: r.overall_manager_comments || [],
      finalRating: r.final_rating,
      interviewNotes: r.interview_notes,
      source: r.source || 'import',
      supervisors: r.supervisors || [],
      createdAt: r.created_at,
      items: (r.prp_items || []).map((i: any) => ({
        id: i.id,
        prpRecordId: i.prp_record_id,
        itemType: i.item_type,
        itemLabel: i.item_label,
        importance: i.importance,
        selfDescription: i.self_description,
        evaluations: i.evaluations || [],
        itemRating: i.item_rating,
        sortOrder: i.sort_order || 0
      }))
    })) as PRPRecord[];
  },

  async deletePRPRecord(recordId: string): Promise<void> {
    const { error } = await supabase
      .from('prp_records')
      .delete()
      .eq('id', recordId);
    
    if (error) throw error;
  }
};
