// Quick Assessment for Onboarding (10-12 minutes)
// Combines VARK, Multiple Intelligences, and Environmental Preferences

import type { AssessmentQuestion } from './types'

export const quickAssessmentQuestions: AssessmentQuestion[] = [
  // VARK Core Questions (4 questions)
  {
    id: 1,
    question: "You're learning a new software. What do you prefer?",
    category: 'vark',
    options: [
      {
        text: "Watching a tutorial video",
        scores: { visual: 3, spatial: 1 }
      },
      {
        text: "Listening to someone explain it",
        scores: { auditory: 3, linguistic: 1 }
      },
      {
        text: "Reading the manual or documentation",
        scores: { reading_writing: 3, linguistic: 1 }
      },
      {
        text: "Trying it hands-on and figuring it out",
        scores: { kinesthetic: 3, bodily_kinesthetic: 1, logical_mathematical: 1 }
      }
    ]
  },
  {
    id: 2,
    question: "When trying to remember something, you tend to recall:",
    category: 'vark',
    options: [
      {
        text: "Visual images, colors, or spatial arrangements",
        scores: { visual: 3, spatial: 2 }
      },
      {
        text: "Sounds, voices, or verbal descriptions",
        scores: { auditory: 3, musical: 1 }
      },
      {
        text: "Physical sensations or movements you made",
        scores: { kinesthetic: 3, bodily_kinesthetic: 2 }
      },
      {
        text: "Written words or detailed notes you took",
        scores: { reading_writing: 3, linguistic: 1 }
      }
    ]
  },
  {
    id: 3,
    question: "When giving directions to someone, you prefer to:",
    category: 'vark',
    options: [
      {
        text: "Draw a map or show them visually",
        scores: { visual: 3, spatial: 2 }
      },
      {
        text: "Explain verbally step by step",
        scores: { auditory: 3, linguistic: 2 }
      },
      {
        text: "Write down the directions",
        scores: { reading_writing: 3, linguistic: 1 }
      },
      {
        text: "Walk them through it or physically show them",
        scores: { kinesthetic: 3, bodily_kinesthetic: 2, interpersonal: 1 }
      }
    ]
  },
  {
    id: 4,
    question: "You learn best when you can:",
    category: 'vark',
    options: [
      {
        text: "See the big picture with visual representations",
        scores: { visual: 3, spatial: 2 }
      },
      {
        text: "Hear information explained in detail",
        scores: { auditory: 3, linguistic: 1 }
      },
      {
        text: "Practice and apply what you're learning",
        scores: { kinesthetic: 3, bodily_kinesthetic: 1, logical_mathematical: 1 }
      },
      {
        text: "Take detailed notes and review written content",
        scores: { reading_writing: 3, linguistic: 1, intrapersonal: 1 }
      }
    ]
  },

  // Multiple Intelligences (3 questions)
  {
    id: 5,
    question: "Which activity do you enjoy most?",
    category: 'intelligence',
    options: [
      {
        text: "Writing, storytelling, or playing with words",
        scores: { linguistic: 3, reading_writing: 1 }
      },
      {
        text: "Solving puzzles, working with numbers, or logical problems",
        scores: { logical_mathematical: 3, reading_writing: 1 }
      },
      {
        text: "Creating visual art, building things, or spatial design",
        scores: { spatial: 3, visual: 2, bodily_kinesthetic: 1 }
      },
      {
        text: "Physical activities, sports, or hands-on projects",
        scores: { bodily_kinesthetic: 3, kinesthetic: 2 }
      }
    ]
  },
  {
    id: 6,
    question: "How do you prefer to work on projects?",
    category: 'intelligence',
    options: [
      {
        text: "Collaborating and discussing with others",
        scores: { interpersonal: 3, auditory: 1, group_learning: 2 }
      },
      {
        text: "Working independently and reflecting alone",
        scores: { intrapersonal: 3, reading_writing: 1, quiet_environment: 2 }
      },
      {
        text: "Using music or rhythm to help you focus",
        scores: { musical: 3, background_music: 2, auditory: 1 }
      },
      {
        text: "Analyzing patterns and organizing information",
        scores: { logical_mathematical: 3, structured_materials: 2 }
      }
    ]
  },
  {
    id: 7,
    question: "When problem-solving, you prefer to:",
    category: 'learning_cycle',
    options: [
      {
        text: "Jump in and experiment directly",
        scores: { kinesthetic: 2, bodily_kinesthetic: 2, flexible_approach: 2 }
      },
      {
        text: "Think things through carefully first",
        scores: { intrapersonal: 2, logical_mathematical: 2, quiet_environment: 1 }
      },
      {
        text: "Discuss it with others and brainstorm",
        scores: { interpersonal: 2, auditory: 2, group_learning: 2 }
      },
      {
        text: "Research and read about similar problems",
        scores: { reading_writing: 2, linguistic: 2, structured_materials: 1 }
      }
    ]
  },

  // Environmental Preferences (3 questions)
  {
    id: 8,
    question: "Your ideal study environment includes:",
    category: 'environment',
    options: [
      {
        text: "Quiet space with minimal distractions",
        scores: { quiet_environment: 3, intrapersonal: 1 }
      },
      {
        text: "Group setting where you can discuss and collaborate",
        scores: { group_learning: 3, interpersonal: 1 }
      },
      {
        text: "Background music or ambient sounds",
        scores: { background_music: 3, musical: 1 }
      },
      {
        text: "Freedom to move around and take breaks",
        scores: { frequent_breaks: 3, bodily_kinesthetic: 1, kinesthetic: 1 }
      }
    ]
  },
  {
    id: 9,
    question: "When learning new material, you prefer:",
    category: 'environment',
    options: [
      {
        text: "Structured, organized lessons with clear objectives",
        scores: { structured_materials: 3, reading_writing: 1, logical_mathematical: 1 }
      },
      {
        text: "Flexible, informal learning that you can explore",
        scores: { flexible_approach: 3, kinesthetic: 1 }
      },
      {
        text: "Visual aids like diagrams, charts, and mind maps",
        scores: { visual: 2, spatial: 2, structured_materials: 1 }
      },
      {
        text: "Interactive discussions and group activities",
        scores: { auditory: 1, interpersonal: 2, group_learning: 2 }
      }
    ]
  },
  {
    id: 10,
    question: "Which statement best describes you?",
    category: 'social',
    options: [
      {
        text: "I notice and remember visual details like colors and spatial layouts",
        scores: { visual: 2, spatial: 2 }
      },
      {
        text: "I'm sensitive to sounds and remember verbal information well",
        scores: { auditory: 2, musical: 2 }
      },
      {
        text: "I'm very aware of textures, temperatures, and physical sensations",
        scores: { kinesthetic: 2, bodily_kinesthetic: 2 }
      },
      {
        text: "I enjoy writing things down and organizing information in notes",
        scores: { reading_writing: 2, linguistic: 2 }
      }
    ]
  },

  // Socratic/Teaching Style Preferences (5 questions)
  {
    id: 11,
    question: "When learning something new, you prefer:",
    category: 'teaching_style',
    options: [
      {
        text: "Being guided through questions that help you discover the answer yourself",
        scores: { socratic: 3, intrapersonal: 1 }
      },
      {
        text: "Getting clear explanations and direct answers right away",
        scores: { direct: 3, structured_materials: 1 }
      },
      {
        text: "A mix of both - some guidance and some direct answers",
        scores: { socratic: 1, direct: 1, flexible_approach: 1 }
      },
      {
        text: "Figuring it out entirely on my own without help",
        scores: { socratic: 1, intrapersonal: 2 }
      }
    ]
  },
  {
    id: 12,
    question: "When you're stuck on a problem, you'd rather:",
    category: 'teaching_style',
    options: [
      {
        text: "Have someone ask me questions to help me think it through",
        scores: { socratic: 3, auditory: 1 }
      },
      {
        text: "Be shown the solution step-by-step",
        scores: { direct: 3, visual: 1, structured_materials: 1 }
      },
      {
        text: "Be given hints that point me in the right direction",
        scores: { socratic: 2, direct: 1 }
      },
      {
        text: "Try different approaches until I find the answer",
        scores: { socratic: 1, kinesthetic: 1, flexible_approach: 1 }
      }
    ]
  },
  {
    id: 13,
    question: "You learn most deeply when:",
    category: 'teaching_style',
    options: [
      {
        text: "Someone challenges my thinking with thought-provoking questions",
        scores: { socratic: 3, logical_mathematical: 1 }
      },
      {
        text: "Information is presented clearly and comprehensively",
        scores: { direct: 3, reading_writing: 1 }
      },
      {
        text: "I can discuss and debate ideas with others",
        scores: { socratic: 2, interpersonal: 2, group_learning: 1 }
      },
      {
        text: "I receive immediate feedback on my understanding",
        scores: { direct: 2, kinesthetic: 1 }
      }
    ]
  },
  {
    id: 14,
    question: "In a learning situation, you prefer when the teacher:",
    category: 'teaching_style',
    options: [
      {
        text: "Asks questions that make me reflect and reason",
        scores: { socratic: 3, intrapersonal: 1 }
      },
      {
        text: "Provides complete explanations with examples",
        scores: { direct: 3, structured_materials: 1 }
      },
      {
        text: "Facilitates discovery through guided exploration",
        scores: { socratic: 2, flexible_approach: 1 }
      },
      {
        text: "Lets me learn at my own pace with resources available",
        scores: { direct: 1, intrapersonal: 2, flexible_approach: 1 }
      }
    ]
  },
  {
    id: 15,
    question: "When explaining concepts back to someone, you find it most valuable to:",
    category: 'teaching_style',
    options: [
      {
        text: "Answer their probing questions about my reasoning",
        scores: { socratic: 3, linguistic: 1 }
      },
      {
        text: "Clearly state the facts and main points",
        scores: { direct: 3, reading_writing: 1 }
      },
      {
        text: "Engage in a back-and-forth dialogue exploring the topic",
        scores: { socratic: 2, interpersonal: 2 }
      },
      {
        text: "Demonstrate or show examples of the concept in action",
        scores: { direct: 2, visual: 1, kinesthetic: 1 }
      }
    ]
  }
]
