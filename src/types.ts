/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Exam {
  id: number;
  title: string;
  description: string;
  duration: number; // in minutes
  questionsCount: number;
  passingGrade: number; // in points
  maxScore: number;
  createdAt: string;
}

export interface Question {
  id: number;
  examId: number;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  optionE: string;
  correctOption?: string; // Optional for students to prevent leaks
  scorePoints: number;
  orderNo: number;
}

export interface Submission {
  id: number;
  examId: number;
  examTitle?: string;
  studentName: string;
  studentEmail: string;
  guardianEmail: string;
  startedAt: string;
  submittedAt: string | null;
  score: number;
  maxScore: number;
  isPassed: boolean;
  answers: Record<number, string>; // Maps questionId -> selectedOption (A/B/C/D/E)
  status: 'ongoing' | 'completed';
  offlineSync: boolean;
}

export interface ExamAnalysis {
  totalParticipants: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  passingCount: number;
  passingPercentage: number;
  gradeDistribution: Record<string, number>; // "A" (>=85), "B" (70-84), "C" (60-69), "D" (<60)
  questionStats: {
    questionId: number;
    questionText: string;
    correctCount: number;
    wrongCount: number;
    successRate: number;
  }[];
}

export interface ImportPreviewQuestion {
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  optionE: string;
  correctOption: string;
  scorePoints: number;
}
