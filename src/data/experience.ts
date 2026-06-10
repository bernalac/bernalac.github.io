export interface ExperienceItem {
  role: string;
  company: string;
  period: string;
  description: string;
  current?: boolean;
}

export const experience: ExperienceItem[] = [
  {
    role: "Desarrollador Full Stack Senior",
    company: "Sopra Steria - Generalitat Valenciana",
    period: "2024 - actualidad",
    description: "Desarrollo full stack con Spring Boot y Angular en entorno CI/CD. Mantenimiento evolutivo e incidencias de aplicaciones Java y ZK Framework (MVVM). Análisis estático, pruebas unitarias, documentación técnica e integraciones con GvLogin, GvClau, PAI, Portafirmas, SGDE y Nexus.",
    current: true
  },
  {
    role: "Desarrollador Full Stack",
    company: "Hasten Group - Junta de Andalucía",
    period: "2022 - 2024",
    description: "Desarrollo de aplicaciones Java con JSP, JSF y Spring Boot, e interfaces con React. Gestión completa del ciclo de proyecto: estimación, despliegue, diseño de base de datos SQL, informes y soporte."
  },
  {
    role: "Desarrollador Full Stack",
    company: "Ayesa - Junta de Andalucía",
    period: "2021 - 2022",
    description: "Mantenimiento evolutivo de aplicaciones públicas con Java, Spring Boot y PHP. Interfaces con HTML, CSS, Bootstrap y Thymeleaf. Integraciones con PTWanda, Trewa y VEA."
  },
  {
    role: "SysAdmin / DevOps",
    company: "Skudonet - Producto propio",
    period: "2019 - 2020",
    description: "Monitoreo de infraestructura con Icinga2, gestión de backups con Bareos y administración de red con Omada. Implantación de Passbolt y Nextcloud. Automatización con Ansible y Bash, virtualización con Xen, VMware, Hyper-V y KVM."
  },
];