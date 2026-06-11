export type SkillLevel = "expert" | "mid" | "basic";

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
  { name: "PHP",           category: "Backend", level: "basic"  },
  { name: "Laravel",       category: "Backend", level: "basic"  },

  // Frontend
  { name: "TypeScript",       category: "Frontend", level: "expert" },
  { name: "Angular",          category: "Frontend", level: "expert" },
  { name: "JavaScript",       category: "Frontend", level: "expert" },
  { name: "Tailwind CSS",     category: "Frontend", level: "expert" },
  { name: "HTML",             category: "Frontend", level: "expert" },
  { name: "CSS",              category: "Frontend", level: "expert" },
  { name: "React",            category: "Frontend", level: "mid"    },
  { name: "Astro",            category: "Frontend", level: "mid"    },
  { name: "Responsive Design",category: "Frontend", level: "mid"    },
  { name: "Bootstrap",        category: "Frontend", level: "basic"  },

  // Bases de datos
  { name: "PostgreSQL", category: "Bases de datos", level: "expert" },
  { name: "MySQL",      category: "Bases de datos", level: "expert" },
  { name: "SQL",        category: "Bases de datos", level: "expert" },
  { name: "Redis",      category: "Bases de datos", level: "mid"    },
  { name: "H2DB",       category: "Bases de datos", level: "basic"  },

  // Cloud & DevOps
  { name: "Docker",         category: "Cloud & DevOps", level: "expert" },
  { name: "CI/CD",          category: "Cloud & DevOps", level: "expert" },
  { name: "Linux",          category: "Cloud & DevOps", level: "expert" },
  { name: "GitHub Actions", category: "Cloud & DevOps", level: "mid"    },
  { name: "Jenkins",        category: "Cloud & DevOps", level: "mid"    },
  { name: "Ansible",        category: "Cloud & DevOps", level: "mid"    },

  // Herramientas
  { name: "Git",      category: "Herramientas", level: "expert" },
  { name: "GitHub",   category: "Herramientas", level: "expert" },
  { name: "Postman",  category: "Herramientas", level: "expert" },
  { name: "Jira",     category: "Herramientas", level: "mid"    },
  { name: "Figma",    category: "Herramientas", level: "mid"    },
  { name: "Subversion",category:"Herramientas", level: "mid"    },
];