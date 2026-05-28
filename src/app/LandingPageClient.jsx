"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/context/SessionContext";

export default function LandingPageClient({ initialHtml }) {
  const router = useRouter();
  const { user, loading } = useSession();
  const [redirecting, setRedirecting] = useState(true);

  // 1. Session-based redirection for authenticated users
  useEffect(() => {
    if (!loading) {
      if (user) {
        if (user.role === "super_admin") {
          router.push("/super-admin/dashboard");
        } else if (["admin", "company_admin", "hr"].includes(user.role)) {
          router.push("/admin/dashboard");
        } else if (user.role === "employee") {
          router.push("/employee/dashboard");
        } else if (user.role === "attendance_only") {
          router.push("/admin/attendance");
        } else {
          setRedirecting(false);
        }
      } else {
        setRedirecting(false);
      }
    }
  }, [user, loading, router]);

  // 2. Initialize interactive JavaScript behaviors from the portfolio on mount
  useEffect(() => {
    if (redirecting) return;

    // --- NAV SCROLL BG CHANGE ---
    const nav = document.getElementById("nav");
    const handleScroll = () => {
      if (window.scrollY > 12) {
        nav?.classList.add("scrolled");
      } else {
        nav?.classList.remove("scrolled");
      }
    };
    window.addEventListener("scroll", handleScroll);

    // --- MODULE TABS SWITCHING ---
    const tabs = document.querySelectorAll(".modules-tabs .tab");
    const cards = document.querySelectorAll(".module-card");
    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        tabs.forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        const cat = tab.getAttribute("data-cat");
        cards.forEach((c) => {
          c.classList.remove("visible");
          if (c.getAttribute("data-cat") === cat) {
            setTimeout(() => c.classList.add("visible"), 30);
          }
        });
      });
    });

    // --- INTERSECTION OBSERVER FOR REVEAL ANIMATIONS ---
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
    );
    document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));

    // --- COUNTER STATS ANIMATION ---
    const counterObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target;
            const target = parseInt(el.getAttribute("data-count"));
            const original = el.textContent;
            let current = 0;
            const duration = 1400;
            const steps = 40;
            const inc = target / steps;
            const interval = duration / steps;
            const t = setInterval(() => {
              current += inc;
              if (current >= target) {
                el.textContent = original;
                clearInterval(t);
              } else {
                const suffix = original.replace(/[\d,]/g, "").trim();
                const formatted = Math.floor(current).toLocaleString();
                el.textContent =
                  suffix && !/^\d/.test(suffix)
                    ? formatted +
                      (suffix.startsWith("%") || suffix.startsWith("+")
                        ? suffix
                        : " " + suffix)
                    : formatted;
              }
            }, interval);
            counterObserver.unobserve(el);
          }
        });
      },
      { threshold: 0.5 }
    );
    document.querySelectorAll("[data-count]").forEach((el) =>
      counterObserver.observe(el)
    );

    // --- ATTENDANCE CALENDAR RENDERER ---
    const cal = document.getElementById("attCalendar");
    if (cal && cal.children.length === 0) {
      const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      days.forEach((d) => {
        const h = document.createElement("div");
        h.style.cssText =
          "font-size:10px; font-weight:600; color:var(--text-soft); text-align:center; padding-bottom:4px;";
        h.textContent = d;
        cal.appendChild(h);
      });

      const states = [
        "present", "present", "present", "present", "present", "weekend", "weekend",
        "present", "present", "wfh", "present", "present", "weekend", "weekend",
        "leave", "present", "present", "present", "present", "weekend", "weekend",
        "present", "wfh", "present", "present", "today", "weekend", "weekend",
        "absent", "present", "present", "present", "present", "weekend", "weekend"
      ];
      for (let i = 0; i < 35; i++) {
        const d = document.createElement("div");
        d.className = "att-day " + states[i];
        d.textContent = i + 1;
        cal.appendChild(d);
      }
    }

    // --- SMOOTH SCROLL ANCHORS ---
    const anchorHandler = (e) => {
      const href = e.currentTarget.getAttribute("href");
      if (href && href.startsWith("#") && href !== "#") {
        e.preventDefault();
        const target = document.querySelector(href);
        target?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };
    document.querySelectorAll('a[href^="#"]').forEach((a) => {
      a.addEventListener("click", anchorHandler);
    });

    // --- MOBILE MENU TOGGLE ---
    const menuToggle = document.querySelector(".menu-toggle");
    const navLinks = document.querySelector(".nav-links");
    const handleMenuClick = () => {
      navLinks?.classList.toggle("active");
    };
    menuToggle?.addEventListener("click", handleMenuClick);

    // --- DYNAMIC DEMO REQUEST FORM SUBMISSION ---
    const form = document.getElementById("contact-form");
    const formFields = form?.querySelector(".form-fields");
    const formSuccess = form?.querySelector(".form-success");

    const handleFormSubmit = async (e) => {
      e.preventDefault();
      
      const email = document.getElementById("cf-email")?.value;
      const name = document.getElementById("cf-name")?.value;
      const phone = document.getElementById("cf-phone")?.value;
      const companyName = document.getElementById("cf-company")?.value;
      const companySize = document.getElementById("cf-size")?.value;

      // Add loading state to button
      const submitBtn = form.querySelector(".btn-form-submit");
      const origBtnText = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch animate-spin"></i> Provisioning sandbox...';

      try {
        const response = await fetch("/api/demo-request", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name,
            email,
            phone,
            companyName,
            companySize,
          }),
        });

        const data = await response.json();

        if (data.success) {
          // Hide normal fields
          if (formFields) formFields.style.display = "none";
          
          // Inject custom, beautiful credential access card on success
          if (formSuccess) {
            formSuccess.className = "form-success show";
            formSuccess.style.cssText = "display: flex; flex-direction: column; align-items: center; text-align: center; padding: 12px 0;";
            formSuccess.innerHTML = `
              <div class="success-icon" style="width: 56px; height: 56px; border-radius: 50%; background: #eff6ff; color: #2563eb; display: flex; align-items: center; justify-content: center; font-size: 24px; margin: 0 auto 16px auto;">
                <i class="fa-solid fa-key"></i>
              </div>
              <h4 style="font-size: 18px; font-weight: 800; color: #0f172a; margin-bottom: 8px;">Demo Sandbox Ready!</h4>
              <p style="font-size: 14px; color: #475569; margin-bottom: 16px;">We've automatically provisioned your administrator sandbox and emailed your credentials.</p>
              
              <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); padding: 16px; border-radius: 10px; border: 1px solid #bfdbfe; width: 100%; text-align: left; margin-bottom: 20px; box-sizing: border-box;">
                <div style="margin-bottom: 12px;">
                  <span style="font-size: 10px; color: #1e40af; font-weight: 800; display: block; margin-bottom: 4px; letter-spacing: 0.05em;">LOGIN EMAIL</span>
                  <code style="font-family: monospace; font-size: 14px; color: #0f172a; font-weight: 700; background: #ffffff; padding: 3px 8px; border-radius: 4px; border: 1px solid #bfdbfe; display: inline-block;">${email}</code>
                </div>
                <div>
                  <span style="font-size: 10px; color: #1e40af; font-weight: 800; display: block; margin-bottom: 4px; letter-spacing: 0.05em;">TEMPORARY PASSWORD</span>
                  <code style="font-family: monospace; font-size: 14px; color: #0f172a; font-weight: 700; background: #ffffff; padding: 3px 8px; border-radius: 4px; border: 1px solid #bfdbfe; display: inline-block;">${data.credentials?.password || ""}</code>
                </div>
              </div>
              
              <a href="/login" class="btn btn-primary" style="display: block; width: 100%; background: #2563eb; color: #ffffff; text-align: center; padding: 12px; border-radius: 8px; font-weight: 700; text-decoration: none; box-shadow: 0 4px 12px rgba(37,99,235,0.25); box-sizing: border-box;">
                Launch Sandbox Now <i class="fa-solid fa-arrow-right" style="margin-left: 6px;"></i>
              </a>
            `;
          }
        } else {
          alert(data.message || "Failed to provision sandbox. Please try again.");
          submitBtn.disabled = false;
          submitBtn.innerHTML = origBtnText;
        }
      } catch (err) {
        console.error("Submit error:", err);
        alert("A network error occurred. Please try again.");
        submitBtn.disabled = false;
        submitBtn.innerHTML = origBtnText;
      }
    };

    form?.addEventListener("submit", handleFormSubmit);

    // Cleanup listeners on unmount
    return () => {
      window.removeEventListener("scroll", handleScroll);
      document.querySelectorAll('a[href^="#"]').forEach((a) => {
        a.removeEventListener("click", anchorHandler);
      });
      menuToggle?.removeEventListener("click", handleMenuClick);
      form?.removeEventListener("submit", handleFormSubmit);
    };
  }, [redirecting]);

  if (loading || redirecting) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="text-slate-500 font-medium">Loading Innonsh WorkGrid...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      dangerouslySetInnerHTML={{ __html: initialHtml }}
      style={{ width: "100%", height: "100%" }}
    />
  );
}
