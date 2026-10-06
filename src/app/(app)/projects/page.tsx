import { auth } from "@clerk/nextjs/server";
import { ProjectsClient } from "@/components/projects/projects-client";
export default async function ProjectsPage(){await auth.protect();return <ProjectsClient/>;}
