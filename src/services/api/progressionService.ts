import { marathonService } from './marathonService';
import { xpService } from './xpService';

export const progressionService = {
  async handleTaskCompletion(userId: string) {
    try {
      // 1. Get user's active marathon participations
      const participations = await marathonService.getParticipation(userId);
      const activeParticipations = participations.filter((p: any) => !p.completed && p.marathon?.status === 'active');

      const completedMarathons = [];

      for (const participation of activeParticipations) {
        const newProgress = (participation.progress || 0) + 1;
        const marathon = participation.marathon;

        // Update progress in DB
        await marathonService.updateProgress(participation.id, newProgress, marathon.task_goal);

        // If newly completed
        if (newProgress === marathon.task_goal) {
          await xpService.logXP(userId, marathon.xp_reward, 'marathon', marathon.id);
          completedMarathons.push(marathon);
        }
      }

      // 2. XP for the task itself
      await xpService.logXP(userId, 50, 'task'); // Standard 50 XP per task

      return { completedMarathons };
    } catch (err) {
      console.error('Progression update failed:', err);
      return { completedMarathons: [] };
    }
  }
};
