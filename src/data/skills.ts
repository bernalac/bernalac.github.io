export type SkillLevel = "expert" | "mid";

export interface Skill {
  name: string;
  category: string;
  level: SkillLevel;
}

export const skills: Skill[] = [
  // Backend
  { name: "Java",          category: "Backend", level: "expert" },
  { name: "Spring Boot",   category: "Backend", level: "expert" },
  { name: "REST API",      category: "Backend", level: "expert" },
  { name: "Hibernate",     category: "Backend", level: "expert" },
  { name: "JPA",           category: "Backend", level: "expert" },
  { name: "Microservicios",category: "Backend", level: "mid"    },
  { name: "JUnit",         category: "Backend", level: "mid"    },
  { name: "Python",        category: "Backend", level: "mid"    },
  { name: "Flask",         category: "Backend", level: "mid"    },
  { name: "PHP",           category: "Backend", level: "mid"  },
  { name: "Laravel",       category: "Backend", level: "mid"  },

  // Frontend
  { name: "TypeScript",       category: "Frontend", level: "mid" },
  { name: "Angular",          category: "Frontend", level: "mid" },
  { name: "JavaScript",       category: "Frontend", level: "mid" },
  { name: "Tailwind CSS",     category: "Frontend", level: "mid" },
  { name: "HTML",             category: "Frontend", level: "mid" },
  { name: "CSS",              category: "Frontend", level: "mid" },
  { name: "React",            category: "Frontend", level: "mid"    },
  { name: "Astro",            category: "Frontend", level: "mid"    },
  { name: "Responsive Design",category: "Frontend", level: "mid"    },
  { name: "Bootstrap",        category: "Frontend", level: "mid"  },

  // Bases de datos
  { name: "SQL",        category: "Bases de datos", level: "expert" },
  { name: "PostgreSQL", category: "Bases de datos", level: "mid" },
  { name: "MySQL",      category: "Bases de datos", level: "mid" },
  { name: "Redis",      category: "Bases de datos", level: "mid"    },
  { name: "H2DB",       category: "Bases de datos", level: "mid"  },

  // Cloud & DevOps
  { name: "Docker",         category: "Cloud & DevOps", level: "mid" },
  { name: "CI/CD",          category: "Cloud & DevOps", level: "mid" },
  { name: "Linux",          category: "Cloud & DevOps", level: "mid" },
  { name: "GitHub Actions", category: "Cloud & DevOps", level: "mid"    },
  { name: "Jenkins",        category: "Cloud & DevOps", level: "mid"    },
  { name: "Ansible",        category: "Cloud & DevOps", level: "mid"    },

  // Herramientas
  { name: "Git",      category: "Herramientas", level: "expert" },
  { name: "GitHub",   category: "Herramientas", level: "expert" },
  { name: "Postman",  category: "Herramientas", level: "expert" },
  { name: "Subversion",category:"Herramientas", level: "expert" },
  { name: "Jira",     category: "Herramientas", level: "mid"    },
  { name: "Figma",    category: "Herramientas", level: "mid"    },
];