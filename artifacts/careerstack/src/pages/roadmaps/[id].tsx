import { useParams, Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuthedFetch } from "@/lib/api-fetch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, CheckCircle2, Circle, Clock, Milestone as MilestoneIcon } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Task {
  id: number;
  title: string;
  completed: number | boolean;
}

interface Milestone {
  id: number;
  title: string;
  description: string | null;
  estimatedDuration: string;
  industryRelevance: string;
  status: string;
  tasks: Task[];
}

interface RoadmapDetail {
  id: number;
  technology: string;
  milestones: Milestone[];
  createdAt: string;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useRoadmapDetail(id: number) {
  const apiFetch = useAuthedFetch();
  return useQuery<RoadmapDetail>({
    queryKey: [`/api/roadmaps/${id}`],
    queryFn: () => apiFetch<RoadmapDetail>(`/api/roadmaps/${id}`),
    enabled: !!id && !isNaN(id),
  });
}

function useToggleRoadmapTask(roadmapId: number) {
  const apiFetch = useAuthedFetch();
  return useMutation<Task, Error, number>({
    mutationFn: (taskId: number) =>
      apiFetch<Task>(`/api/roadmaps/${roadmapId}/tasks/${taskId}/toggle`, { method: "PATCH" }),
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function RoadmapDetail() {
  const { id } = useParams();
  const roadmapId = parseInt(id ?? "");
  const queryClient = useQueryClient();

  const { data: roadmap, isLoading, isError } = useRoadmapDetail(roadmapId);
  const toggleMutation = useToggleRoadmapTask(roadmapId);

  const handleToggle = async (taskId: number) => {
    try {
      await toggleMutation.mutateAsync(taskId);
      // Refetch to get updated task state and milestone statuses
      queryClient.invalidateQueries({ queryKey: [`/api/roadmaps/${roadmapId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/roadmaps"] });
    } catch (e) {
      console.error("Failed to toggle task:", e);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-primary/20 mb-4" />
          <div className="text-muted-foreground">Loading roadmap...</div>
        </div>
      </div>
    );
  }

  if (isError || !roadmap) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="text-muted-foreground text-lg">Roadmap not found</div>
        <Link href="/roadmaps" className="text-primary hover:underline text-sm">
          ← Back to Roadmaps
        </Link>
      </div>
    );
  }

  // Compute overall progress
  const allTasks = roadmap.milestones.flatMap(ms => ms.tasks);
  const totalTasks = allTasks.length;
  const completedTasks = allTasks.filter(t => t.completed).length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center space-x-4 mb-2">
        <Link href="/roadmaps" className="inline-flex items-center justify-center rounded-xl p-2 hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">{roadmap.technology} Roadmap</h1>
          <p className="text-muted-foreground">Step-by-step guide to mastery</p>
        </div>
      </div>

      {/* Overall progress bar */}
      <Card className="glass rounded-2xl border-border/50">
        <CardContent className="py-5 px-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-muted-foreground">
              {completedTasks} of {totalTasks} tasks completed
            </span>
            <span className="text-xl font-bold text-primary">{progressPercent}%</span>
          </div>
          <div className="relative w-full h-3 rounded-full bg-muted overflow-hidden">
            <motion.div
              className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-primary to-emerald-500"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Milestones timeline */}
      <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
        {roadmap.milestones.map((milestone, index) => {
          const msTasks = milestone.tasks;
          const msCompleted = msTasks.filter(t => t.completed).length;
          const msTotal = msTasks.length;

          // Derive status from actual task completion
          const isCompleted = msTotal > 0 && msCompleted === msTotal;
          const isInProgress = msCompleted > 0 && !isCompleted;

          return (
            <motion.div
              key={milestone.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"
            >
              {/* Timeline dot */}
              <div className={cn(
                "flex items-center justify-center w-10 h-10 rounded-full border-4 border-background shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10 transition-colors duration-300",
                isCompleted ? "bg-green-500" : isInProgress ? "bg-yellow-500" : "bg-muted"
              )}>
                {isCompleted ? (
                  <CheckCircle2 className="w-6 h-6 text-white" />
                ) : isInProgress ? (
                  <MilestoneIcon className="w-6 h-6 text-white" />
                ) : (
                  <Circle className="w-6 h-6 text-muted-foreground" />
                )}
              </div>

              {/* Card */}
              <Card className={cn(
                "w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] glass rounded-2xl border-border/50 transition-all duration-300",
                isCompleted ? "bg-green-500/5 border-green-500/20" : isInProgress ? "bg-yellow-500/5 border-yellow-500/20 ring-1 ring-yellow-500/20" : ""
              )}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start gap-4">
                    <CardTitle className="text-lg leading-tight">{milestone.title}</CardTitle>
                    <Badge
                      variant={isCompleted ? "default" : isInProgress ? "secondary" : "outline"}
                      className={cn(
                        "shrink-0",
                        isCompleted ? "bg-green-500 hover:bg-green-600" : isInProgress ? "bg-yellow-500/20 text-yellow-600 hover:bg-yellow-500/30" : ""
                      )}
                    >
                      {isCompleted ? "completed" : isInProgress ? "in progress" : "not started"}
                    </Badge>
                  </div>
                  {milestone.description && (
                    <CardDescription className="mt-2 text-sm">{milestone.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mb-3">
                    <span className="flex items-center"><Clock className="w-3.5 h-3.5 mr-1" /> {milestone.estimatedDuration}</span>
                    <span className="px-2 py-0.5 rounded bg-muted/50 font-medium">Why: {milestone.industryRelevance}</span>
                  </div>

                  {/* Milestone progress */}
                  {msTotal > 0 && (
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>{msCompleted}/{msTotal} tasks</span>
                        <span>{Math.round((msCompleted / msTotal) * 100)}%</span>
                      </div>
                      <Progress value={(msCompleted / msTotal) * 100} className="h-1.5" />
                    </div>
                  )}

                  {/* Tasks checklist */}
                  <div className="space-y-3 pt-2 border-t border-border/50">
                    {milestone.tasks.map((task) => {
                      const isTaskDone = Boolean(task.completed);
                      return (
                        <div key={task.id} className="flex items-start space-x-3 group/task">
                          <Checkbox
                            id={`task-${task.id}`}
                            checked={isTaskDone}
                            onCheckedChange={() => handleToggle(task.id)}
                            disabled={toggleMutation.isPending}
                            className={cn(
                              "mt-0.5 transition-all data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500",
                              !isTaskDone && "border-muted-foreground/50 group-hover/task:border-primary"
                            )}
                          />
                          <label
                            htmlFor={`task-${task.id}`}
                            className={cn(
                              "text-sm leading-tight cursor-pointer select-none transition-colors",
                              isTaskDone ? "text-muted-foreground line-through" : "font-medium"
                            )}
                          >
                            {task.title}
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
