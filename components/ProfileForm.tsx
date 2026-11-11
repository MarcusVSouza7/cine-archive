"use client";

import { useActionState, useState } from "react";
import { saveProfile, type Resultado } from "@/app/actions";
import type { Profile } from "@/lib/types";

export function ProfileForm({ profile }: { profile: Profile }) {
  const [estado, salvar, salvando] = useActionState<Resultado | null, FormData>(
    saveProfile,
    null
  );
  const [handle, setHandle] = useState(profile.handle);
  const [bio, setBio] = useState(profile.bio ?? "");

  return (
    <form action={salvar} className="logform">
      <div className="field">
        <label htmlFor="handle">Handle</label>
        <div className="handle-row">
          <span className="handle-prefix">/u/</span>
          <input
            id="handle"
            name="handle"
            className="inp"
            value={handle}
            onChange={(e) =>
              setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))
            }
            minLength={3}
            maxLength={24}
            required
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <p className="hint-s">
          De 3 a 24 caracteres: minúsculas, números e <code>_</code>. É o
          endereço público do seu perfil.
        </p>
      </div>

      <div className="field">
        <label htmlFor="displayName">Nome</label>
        <input
          id="displayName"
          name="displayName"
          className="inp"
          defaultValue={profile.displayName}
          maxLength={60}
          required
        />
      </div>

      <div className="field">
        <label htmlFor="bio">
          Bio <span className="opt">opcional</span>
        </label>
        <textarea
          id="bio"
          name="bio"
          className="inp area"
          rows={3}
          maxLength={500}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="O que você procura no cinema."
        />
        <p className="hint-s">{500 - bio.length} caracteres restantes</p>
      </div>

      <div className="logform-foot">
        <span />
        <button type="submit" className="btn" disabled={salvando}>
          {salvando ? "Salvando…" : "Salvar perfil"}
        </button>
      </div>

      {estado && (
        <p
          className={estado.ok ? "form-msg ok" : "form-msg err"}
          role="status"
          aria-live="polite"
        >
          {estado.ok ? estado.aviso : estado.erro}
        </p>
      )}
    </form>
  );
}
