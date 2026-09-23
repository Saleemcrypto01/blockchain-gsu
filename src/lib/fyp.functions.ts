import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Role = "student" | "supervisor" | "admin";

const BUCKET = "project-documents";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function logAudit(
  db: Awaited<ReturnType<typeof admin>>,
  actorId: string,
  actorEmail: string | null,
  action: string,
  entityType: string,
  entityId: string | null,
  metadata: Record<string, unknown> = {},
) {
  await db.from("audit_logs").insert({
    actor_id: actorId,
    actor_email: actorEmail,
    action,
    entity_type: entityType,
    entity_id: entityId,
    metadata: metadata as never,
  });
}

async function notify(
  db: Awaited<ReturnType<typeof admin>>,
  userId: string,
  title: string,
  body: string,
  link?: string,
) {
  await db.from("notifications").insert({ user_id: userId, title, body, link: link ?? null });
}

async function requireRole(
  db: Awaited<ReturnType<typeof admin>>,
  userId: string,
  role: Role,
): Promise<void> {
  const { data } = await db.from("user_roles").select("role").eq("user_id", userId).eq("role", role).maybeSingle();
  if (!data) throw new Error("Forbidden: insufficient permissions");
}

/* ------------------------------------------------------------------ */
/* Registration                                                        */
/* ------------------------------------------------------------------ */

export const completeRegistration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    role: Role;
    fullName: string;
    matricNumber?: string;
    department?: string;
    programme?: string;
    academicSession?: string;
    staffId?: string;
    title?: string;
    inviteCode?: string;
  }) => input)
  .handler(async ({ data, context }) => {
    const db = await admin();
    const userId = context.userId;
    const email = (context.claims as { email?: string })?.email ?? "";

    const { data: existing } = await db.from("user_roles").select("role").eq("user_id", userId);
    if (existing && existing.length > 0) {
      return { ok: true, role: existing[0]!.role as Role };
    }

    if (data.role === "admin") {
      const expected = process.env["ADMIN_INVITE_CODE"];
      if (!expected) throw new Error("Administrator registration is not available yet.");
      if (!data.inviteCode || data.inviteCode.trim() !== expected) {
        throw new Error("Invalid administrator invite code.");
      }
    }

    if (data.role === "student") {
      const matric = (data.matricNumber ?? "").trim().toUpperCase();
      if (!/^[A-Z0-9]{2,}\/[A-Z0-9]+\/[0-9]{3,}$/.test(matric)) {
        throw new Error("Matriculation number must look like UG22/SCCS/1001.");
      }
      const { data: taken } = await db
        .from("student_profiles")
        .select("user_id")
        .eq("matric_number", matric)
        .maybeSingle();
      if (taken) throw new Error("That matriculation number is already registered.");
    }

    await db.from("profiles").upsert({
      id: userId,
      email,
      full_name: data.fullName?.trim() || email.split("@")[0]!,
    });

    const { error: roleError } = await db.from("user_roles").insert({ user_id: userId, role: data.role });
    if (roleError) throw new Error(roleError.message);

    if (data.role === "student") {
      await db.from("student_profiles").upsert({
        user_id: userId,
        matric_number: (data.matricNumber ?? "").trim().toUpperCase(),
        department: data.department ?? "",
        programme: data.programme ?? "",
        academic_session: data.academicSession ?? "",
      });
    } else if (data.role === "supervisor") {
      await db.from("supervisor_profiles").upsert({
        user_id: userId,
        staff_id: data.staffId ?? null,
        department: data.department ?? "",
        title: data.title ?? "Dr.",
      });
    }

    await logAudit(db, userId, email, "register", "user", userId, { role: data.role });
    return { ok: true, role: data.role };
  });

/* ------------------------------------------------------------------ */
/* Blockchain anchoring                                                */
/* ------------------------------------------------------------------ */

async function getContractAddress(db: Awaited<ReturnType<typeof admin>>): Promise<string | null> {
  const { readContractAddress } = await import("./chain.server");
  const { data } = await db.from("system_settings").select("value").eq("key", "blockchain").maybeSingle();
  return readContractAddress(data?.value);
}

async function anchorRecord(recordId: string): Promise<{ anchored: boolean; message: string }> {
  const db = await admin();
  const { data: record } = await db.from("blockchain_records").select("*").eq("id", recordId).maybeSingle();
  if (!record) return { anchored: false, message: "Record not found" };

  const chain = await import("./chain.server");
  const provider = chain.getProvider();
  const contractAddress = await getContractAddress(db);

  if (!provider) {
    await db.from("blockchain_records").update({ status: "pending", error_message: "Blockchain RPC endpoint is not configured." }).eq("id", recordId);
    return { anchored: false, message: "Blockchain RPC endpoint is not configured." };
  }
  const wallet = chain.getWallet(provider);
  if (!wallet) {
    await db.from("blockchain_records").update({ status: "pending", error_message: "Blockchain signing key is not configured." }).eq("id", recordId);
    return { anchored: false, message: "Blockchain signing key is not configured." };
  }
  if (!contractAddress) {
    await db.from("blockchain_records").update({ status: "pending", error_message: "Smart contract has not been deployed yet." }).eq("id", recordId);
    return { anchored: false, message: "Smart contract has not been deployed yet." };
  }

  try {
    const { ethers } = await import("ethers");
    const contract = new ethers.Contract(contractAddress, chain.CONTRACT_ABI, wallet);
    const tx = await contract["anchor"]!(
      record.record_key,
      chain.toBytes32Hash(record.document_hash),
      record.project_id,
      record.submission_id,
    );
    const receipt = await tx.wait(1);
    await db
      .from("blockchain_records")
      .update({
        tx_hash: receipt?.hash ?? tx.hash,
        block_number: receipt ? Number(receipt.blockNumber) : null,
        contract_address: contractAddress,
        status: "confirmed",
        error_message: null,
        anchored_at: new Date().toISOString(),
      })
      .eq("id", recordId);
    return { anchored: true, message: "Anchored on Sepolia" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown blockchain error";
    await db
      .from("blockchain_records")
      .update({ status: "failed", error_message: message.slice(0, 400), contract_address: contractAddress })
      .eq("id", recordId);
    return { anchored: false, message };
  }
}

export const retryAnchor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { recordId: string }) => input)
  .handler(async ({ data, context }) => {
    const db = await admin();
    const { data: record } = await db
      .from("blockchain_records")
      .select("id, project_id, projects(student_id, supervisor_id)")
      .eq("id", data.recordId)
      .maybeSingle();
    if (!record) throw new Error("Record not found");
    const project = record.projects as unknown as { student_id: string; supervisor_id: string | null } | null;
    const { data: isAdmin } = await db
      .from("user_roles").select("role").eq("user_id", context.userId).eq("role", "admin").maybeSingle();
    if (!isAdmin && project?.student_id !== context.userId && project?.supervisor_id !== context.userId) {
      throw new Error("Forbidden");
    }
    return anchorRecord(data.recordId);
  });

export const deployContract = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await admin();
    await requireRole(db, context.userId, "admin");
    const chain = await import("./chain.server");
    const provider = chain.getProvider();
    if (!provider) throw new Error("Blockchain RPC endpoint is not configured.");
    const wallet = chain.getWallet(provider);
    if (!wallet) throw new Error("Blockchain signing key is not configured.");

    const { ethers } = await import("ethers");
    const factory = new ethers.ContractFactory(chain.CONTRACT_ABI, chain.CONTRACT_BYTECODE, wallet);
    const contract = await factory.deploy();
    await contract.waitForDeployment();
    const address = await contract.getAddress();

    const { data: current } = await db.from("system_settings").select("value").eq("key", "blockchain").maybeSingle();
    const value = { ...(current?.value as Record<string, unknown> | null ?? {}), network: "sepolia", contract_address: address };
    await db.from("system_settings").upsert({ key: "blockchain", value: value as never, updated_at: new Date().toISOString() });
    await logAudit(db, context.userId, null, "deploy_contract", "blockchain", null, { address });
    return { address };
  });

export const getChainStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const db = await admin();
    const chain = await import("./chain.server");
    const address = await getContractAddress(db);
    let walletAddress: string | null = null;
    let balance: string | null = null;
    const provider = chain.getProvider();
    if (provider) {
      const wallet = chain.getWallet(provider);
      if (wallet) {
        walletAddress = wallet.address;
        try {
          const { ethers } = await import("ethers");
          balance = ethers.formatEther(await provider.getBalance(wallet.address));
        } catch {
          balance = null;
        }
      }
    }
    return {
      network: chain.NETWORK_NAME,
      rpcConfigured: Boolean(chain.getRpcUrl()),
      walletConfigured: Boolean(walletAddress),
      walletAddress,
      balance,
      contractAddress: address,
    };
  });

/* ------------------------------------------------------------------ */
/* Submission workflow                                                 */
/* ------------------------------------------------------------------ */

export const submitProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { projectId: string; isFinal?: boolean }) => input)
  .handler(async ({ data, context }) => {
    const db = await admin();
    const userId = context.userId;

    const { data: project } = await db.from("projects").select("*").eq("id", data.projectId).maybeSingle();
    if (!project) throw new Error("Project not found");
    if (project.student_id !== userId) throw new Error("Forbidden: not your project");
    if (project.status === "approved") throw new Error("This project has already been approved.");
    if (project.status === "submitted" || project.status === "under_review") {
      throw new Error("A submission is already awaiting review.");
    }

    const { data: versions } = await db
      .from("project_versions")
      .select("*")
      .eq("project_id", data.projectId)
      .not("chapter_number", "is", null)
      .order("version_number", { ascending: false });
    const currentVersions = [1, 2, 3, 4, 5].map((chapter) =>
      (versions ?? []).find((version) => version.chapter_number === chapter),
    );
    if (currentVersions.some((version) => !version)) {
      throw new Error("Upload Chapter One through Chapter Five before submitting.");
    }

    // Re-hash every current stored chapter server-side; never trust client hashes.
    const { sha256Hex, recordKeyFor } = await import("./chain.server");
    const hashes: string[] = [];
    for (const version of currentVersions) {
      const { data: file, error: dlError } = await db.storage.from(BUCKET).download(version!.file_path);
      if (dlError || !file) throw new Error("Could not read an uploaded chapter.");
      const chapterHash = await sha256Hex(await file.arrayBuffer());
      if (chapterHash !== version!.document_hash) {
        throw new Error("Document integrity check failed — a stored chapter does not match its recorded hash.");
      }
      hashes.push(chapterHash);
    }
    const serverHash = await sha256Hex(new TextEncoder().encode(hashes.join(":" )).buffer);
    const version = currentVersions[0]!;

    const { data: submission, error: subError } = await db
      .from("submissions")
      .insert({
        project_id: project.id,
        version_id: version.id,
        student_id: userId,
        supervisor_id: project.supervisor_id,
        version_number: version.version_number,
        document_hash: serverHash,
        status: "submitted",
        is_final: Boolean(data.isFinal),
      })
      .select()
      .single();
    if (subError || !submission) throw new Error(subError?.message ?? "Could not create submission");

    await db.from("projects").update({ status: "submitted" }).eq("id", project.id);

    const { data: record } = await db
      .from("blockchain_records")
      .insert({
        project_id: project.id,
        submission_id: submission.id,
        document_hash: serverHash,
        record_key: recordKeyFor(submission.id),
        network: "sepolia",
        status: "pending",
      })
      .select()
      .single();

    if (project.supervisor_id) {
      await notify(db, project.supervisor_id, "New submission to review", `${project.title} — version ${version.version_number}`, "/assigned");
    }
    await logAudit(db, userId, null, "submit_project", "submission", submission.id, {
      project_id: project.id,
      version: version.version_number,
    });

    let anchor = { anchored: false, message: "Anchoring queued" };
    if (record) anchor = await anchorRecord(record.id);

    return { submissionId: submission.id, documentHash: serverHash, anchor };
  });

export const reviewSubmission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    submissionId: string;
    decision: "approved" | "revision_requested" | "rejected";
    comments: string;
    score?: number | null;
  }) => input)
  .handler(async ({ data, context }) => {
    const db = await admin();
    await requireRole(db, context.userId, "supervisor");

    const { data: submission } = await db.from("submissions").select("*").eq("id", data.submissionId).maybeSingle();
    if (!submission) throw new Error("Submission not found");

    const { data: project } = await db.from("projects").select("*").eq("id", submission.project_id).maybeSingle();
    if (!project) throw new Error("Project not found");

    const { data: assignment } = await db
      .from("supervisor_assignments")
      .select("id").eq("project_id", project.id).eq("supervisor_id", context.userId).eq("is_active", true).maybeSingle();
    if (project.supervisor_id !== context.userId && !assignment) {
      throw new Error("Forbidden: this project is not assigned to you.");
    }
    if (submission.status === "approved") throw new Error("This submission was already approved.");
    if (!data.comments.trim()) throw new Error("Review comments are required.");
    if (data.score != null && (data.score < 0 || data.score > 100)) throw new Error("Score must be between 0 and 100.");

    await db.from("reviews").insert({
      submission_id: submission.id,
      project_id: project.id,
      supervisor_id: context.userId,
      decision: data.decision,
      comments: data.comments.trim(),
      score: data.score ?? null,
    });

    await db
      .from("submissions")
      .update({ status: data.decision, reviewed_at: new Date().toISOString() })
      .eq("id", submission.id);

    const projectStatus =
      data.decision === "approved" ? "approved" : data.decision === "rejected" ? "rejected" : "revision_requested";
    await db.from("projects").update({ status: projectStatus }).eq("id", project.id);

    const label =
      data.decision === "approved" ? "approved" : data.decision === "rejected" ? "rejected" : "sent back for revision";
    await notify(db, project.student_id, `Your submission was ${label}`, project.title, "/history");
    await logAudit(db, context.userId, null, "review_submission", "submission", submission.id, {
      decision: data.decision,
    });

    return { ok: true };
  });

export const markUnderReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { submissionId: string }) => input)
  .handler(async ({ data, context }) => {
    const db = await admin();
    await requireRole(db, context.userId, "supervisor");
    const { data: submission } = await db.from("submissions").select("*").eq("id", data.submissionId).maybeSingle();
    if (!submission) throw new Error("Submission not found");
    const { data: project } = await db.from("projects").select("*").eq("id", submission.project_id).maybeSingle();
    if (!project || (project.supervisor_id !== context.userId)) throw new Error("Forbidden");
    if (submission.status !== "submitted") return { ok: true };
    await db.from("submissions").update({ status: "under_review" }).eq("id", submission.id);
    await db.from("projects").update({ status: "under_review" }).eq("id", project.id);
    return { ok: true };
  });

/* ------------------------------------------------------------------ */
/* Verification                                                        */
/* ------------------------------------------------------------------ */

export const verifySubmission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { submissionId: string }) => input)
  .handler(async ({ data, context }) => {
    // RLS-scoped read decides whether this user may see the submission at all.
    const { data: allowed, error: allowedError } = await context.supabase
      .from("submissions")
      .select("id, project_id, version_id, document_hash, version_number, submitted_at")
      .eq("id", data.submissionId)
      .maybeSingle();
    if (allowedError || !allowed) throw new Error("Submission not found or not accessible.");

    const db = await admin();
    const { data: version } = await db.from("project_versions").select("*").eq("id", allowed.version_id).maybeSingle();
    const { data: projectVersions } = await db
      .from("project_versions")
      .select("*")
      .eq("project_id", allowed.project_id)
      .not("chapter_number", "is", null)
      .order("version_number", { ascending: false });
    const { data: record } = await db
      .from("blockchain_records").select("*").eq("submission_id", allowed.id).maybeSingle();

    let computedHash: string | null = null;
    let storageOk = false;
    const currentVersions = [1, 2, 3, 4, 5].map((chapter) =>
      (projectVersions ?? []).find((item) => item.chapter_number === chapter),
    );
    if (currentVersions.every(Boolean)) {
      const chapterHashes: string[] = [];
      const { sha256Hex } = await import("./chain.server");
      for (const currentVersion of currentVersions) {
        const { data: file } = await db.storage.from(BUCKET).download(currentVersion!.file_path);
        if (!file) break;
        chapterHashes.push(await sha256Hex(await file.arrayBuffer()));
      }
      if (chapterHashes.length === 5) {
        computedHash = await sha256Hex(new TextEncoder().encode(chapterHashes.join(":")).buffer);
        storageOk = true;
      }
    }

    let onChainHash: string | null = null;
    let onChainTimestamp: number | null = null;
    let chainReadError: string | null = null;
    if (record?.record_key) {
      const chain = await import("./chain.server");
      const provider = chain.getProvider();
      const address = await getContractAddress(db);
      if (provider && address) {
        try {
          const { ethers } = await import("ethers");
          const contract = new ethers.Contract(address, chain.CONTRACT_ABI, provider);
          const result = await contract["getRecord"]!(record.record_key);
          if (result[5]) {
            onChainHash = String(result[0]).toLowerCase().replace(/^0x/, "");
            onChainTimestamp = Number(result[3]);
          } else {
            chainReadError = "No record found on-chain for this submission.";
          }
        } catch (error) {
          chainReadError = error instanceof Error ? error.message : "Could not read the blockchain.";
        }
      } else {
        chainReadError = "Blockchain connection is not configured.";
      }
    } else {
      chainReadError = "This submission has no blockchain record.";
    }

    const storedHash = allowed.document_hash;
    const documentMatches = Boolean(computedHash && computedHash === storedHash);
    const chainMatches = Boolean(onChainHash && onChainHash === storedHash);
    const verified = documentMatches && chainMatches;

    return {
      verified,
      documentMatches,
      chainMatches,
      storageOk,
      projectId: allowed.project_id,
      submissionId: allowed.id,
      versionNumber: allowed.version_number,
      storedHash,
      computedHash,
      onChainHash,
      onChainTimestamp,
      chainReadError,
      txHash: record?.tx_hash ?? null,
      blockNumber: record?.block_number ?? null,
      contractAddress: record?.contract_address ?? null,
      network: record?.network ?? "sepolia",
      anchoredAt: record?.anchored_at ?? null,
      submittedAt: allowed.submitted_at,
      fileName: version?.file_name ?? null,
    };
  });

export const getDocumentUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { versionId: string }) => input)
  .handler(async ({ data, context }) => {
    const { data: version, error } = await context.supabase
      .from("project_versions").select("file_path, file_name").eq("id", data.versionId).maybeSingle();
    if (error || !version) throw new Error("Document not accessible.");
    const db = await admin();
    const { data: signed, error: signError } = await db.storage
      .from(BUCKET).createSignedUrl(version.file_path, 300, { download: version.file_name });
    if (signError || !signed) throw new Error("Could not create a download link.");
    return { url: signed.signedUrl, fileName: version.file_name };
  });

/* ------------------------------------------------------------------ */
/* Admin operations                                                    */
/* ------------------------------------------------------------------ */

export const adminAssignSupervisor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { projectId: string; supervisorId: string | null }) => input)
  .handler(async ({ data, context }) => {
    const db = await admin();
    await requireRole(db, context.userId, "admin");

    if (data.supervisorId) {
      await requireRole(db, data.supervisorId, "supervisor");
    }
    await db.from("projects").update({ supervisor_id: data.supervisorId }).eq("id", data.projectId);
    await db.from("supervisor_assignments").update({ is_active: false }).eq("project_id", data.projectId);
    if (data.supervisorId) {
      await db.from("supervisor_assignments").insert({
        project_id: data.projectId,
        supervisor_id: data.supervisorId,
        assigned_by: context.userId,
        is_active: true,
      });
      await db.from("submissions").update({ supervisor_id: data.supervisorId }).eq("project_id", data.projectId);
      const { data: project } = await db.from("projects").select("title, student_id").eq("id", data.projectId).maybeSingle();
      await notify(db, data.supervisorId, "New project assigned", project?.title ?? "A project was assigned to you", "/assigned");
      if (project) await notify(db, project.student_id, "Supervisor assigned", "A supervisor has been assigned to your project.", "/project");
    }
    await logAudit(db, context.userId, null, "assign_supervisor", "project", data.projectId, {
      supervisor_id: data.supervisorId,
    });
    return { ok: true };
  });

export const adminSetUserActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; isActive: boolean }) => input)
  .handler(async ({ data, context }) => {
    const db = await admin();
    await requireRole(db, context.userId, "admin");
    if (data.userId === context.userId) throw new Error("You cannot deactivate your own account.");
    await db.from("profiles").update({ is_active: data.isActive }).eq("id", data.userId);
    await logAudit(db, context.userId, null, data.isActive ? "activate_user" : "deactivate_user", "user", data.userId);
    return { ok: true };
  });

export const adminDeleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string }) => input)
  .handler(async ({ data, context }) => {
    const db = await admin();
    await requireRole(db, context.userId, "admin");
    if (data.userId === context.userId) throw new Error("You cannot delete your own account.");
    const { error } = await db.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    await logAudit(db, context.userId, null, "delete_user", "user", data.userId);
    return { ok: true };
  });

export const adminUpdateSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { key: string; value: Record<string, unknown> }) => input)
  .handler(async ({ data, context }) => {
    const db = await admin();
    await requireRole(db, context.userId, "admin");
    await db.from("system_settings").upsert({
      key: data.key,
      value: data.value as never,
      updated_at: new Date().toISOString(),
    });
    await logAudit(db, context.userId, null, "update_settings", "settings", null, { key: data.key });
    return { ok: true };
  });

export const adminDirectory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await admin();
    await requireRole(db, context.userId, "admin");
    const [{ data: profiles }, { data: roles }, { data: students }, { data: supervisors }] = await Promise.all([
      db.from("profiles").select("*").order("created_at", { ascending: false }),
      db.from("user_roles").select("user_id, role"),
      db.from("student_profiles").select("*"),
      db.from("supervisor_profiles").select("*"),
    ]);
    return {
      profiles: profiles ?? [],
      roles: roles ?? [],
      students: students ?? [],
      supervisors: supervisors ?? [],
    };
  });
