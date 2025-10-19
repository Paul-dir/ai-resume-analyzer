import type { Route } from "./+types/home";
import Navbar from "~/components/Navbar";
import {resumes} from "~/constants";
import {callbackify} from "node:util";
import {resume} from "react-dom/server";
import ResumeCard from "~/components/ResumeCard";
import {usePuterStore} from "~/lib/puter";
import {useLocation, useNavigate} from "react-router-dom";
import {useEffect} from "react";


export function meta({}: Route.MetaArgs) {
  return [
    { title: "Resumind" },
    { name: "description", content: "Smart feedback for your dear job!" },
  ];
}

export default function Home() {
    const { isLoading, auth } = usePuterStore();

    const navigate = useNavigate();
    // Redirect when authenticated
    useEffect(() => {
        if (auth?.isAuthenticated) {
            navigate('/auth?next=/');
        }
    }, [auth?.isAuthenticated]);

    return <main className="bg-[url('/images/bg-main.svg')] bg-cover">
      <Navbar/>
   <section className="main-section">
       <div className="page-heading py-16" >
           <h1>Track Your Application & Resumes </h1>
           <h2>Review your submission and check AI-powered feedback.</h2>
       </div>


      {
          resumes.length > 0 &&(
              <div className="resumes-section">

                  {resumes.map((resume)=>(
                      <ResumeCard key={resume.id} resume={resume} className="w-64"/>

                  ))
                  }
              </div>
          )}
   </section>

      </main>;
}
