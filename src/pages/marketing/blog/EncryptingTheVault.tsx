import { BlogPostLayout } from './BlogPostLayout';
import { getPost } from '@/lib/blog';

export default function EncryptingTheVault() {
  const post = getPost('encrypting-the-vault')!;
  return (
    <BlogPostLayout post={post}>
      <p>
        The data vault is the most sensitive thing AffixAI stores: names,
        government ID numbers, addresses, employer history, signature images.
        It's exactly the dataset you'd most want stolen if you were running a
        phishing scheme. So let's talk about what we do — and what we
        deliberately don't.
      </p>

      <h2>The encryption scheme</h2>

      <p>
        Every vault value is encrypted at the application layer with{' '}
        <strong>AES-256-GCM</strong>. Not "database encryption at rest"
        (which protects you against a stolen physical drive but does nothing
        against a SQL-injection breach), and not column-level transparent
        encryption (which still surfaces plaintext to anyone with a database
        connection). Application-layer encryption means by the time a value
        lands in Postgres, it's already ciphertext + nonce + tag, base64-
        encoded into a TEXT column.
      </p>

      <p>An encrypted row looks like:</p>

      <pre style={{ background: '#0e0f14', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem', overflow: 'auto' }}>
{`encrypted_value:  Zm9vYmFyOjEyMzQ1Njc4OnNvbWVjaXBoZXJ0ZXh0
field_name:       "passport_number"
user_id:          "..."
segment:          "identity"`}
      </pre>

      <p>
        The first 12 bytes of the decoded blob are the GCM nonce (random per
        write), then 16 bytes of authentication tag, then the ciphertext.
        Nonce reuse is the foot-gun in GCM, so we generate it fresh on every
        write and never store the plaintext key alongside the ciphertext.
      </p>

      <h2>Where the key lives</h2>

      <p>
        The encryption key is a 32-byte secret held in the application's
        environment. In production it's loaded from a secrets manager
        (AWS Secrets Manager, Doppler, Infisical, etc.) at startup. The
        database does not know the key. A database dump does not contain
        the key. A backup snapshot does not contain the key.
      </p>

      <p>
        This is the single most important property of the design: an attacker
        who steals a Postgres backup — the most common breach vector for SaaS
        — gets a column of ciphertext and a list of which fields you've
        filled. They don't get the values.
      </p>

      <p>
        It also means <strong>we are physically incapable of reading your
        vault</strong> from the database. Our debugging tooling has to
        explicitly go through the same decrypt code as the application, which
        we audit-log every time it runs. A rogue engineer can't quietly run{' '}
        <code>SELECT email FROM data_vault</code> and walk away with anything
        readable.
      </p>

      <h2>What we deliberately do NOT do</h2>

      <ul>
        <li>
          <strong>We don't use a per-user key</strong> derived from the
          user's password. Sounds nice, but breaks every "I forgot my
          password" flow — you'd lose your vault on every reset. Realistic
          security ≠ theatre. Tradeoff: a server compromise of both the
          key AND the database is fatal. So we make that very hard.
        </li>
        <li>
          <strong>We don't search inside encrypted values.</strong>{' '}
          Searchable encryption schemes (deterministic encryption,
          order-preserving encryption) leak too much. If we need to filter
          ("show me all my documents from 2024"), the filter runs on
          unencrypted metadata, never on vault contents.
        </li>
        <li>
          <strong>We don't train AI models on vault contents.</strong>{' '}
          The auto-affix engine sees vault values transiently — it reads
          them at request time to fill a PDF, then they're discarded. They
          never go into a training dataset. They never go to OpenAI /
          Anthropic / Google. They never leave our infrastructure.
        </li>
        <li>
          <strong>We don't index vault fields with PII for analytics.</strong>{' '}
          Plausible (our analytics provider) sees URLs and referrers,
          nothing else. Sentry, our error reporter, is configured with{' '}
          <code>send_default_pii=False</code> so frame locals don't leak
          decrypted values into error reports.
        </li>
      </ul>

      <h2>Key rotation</h2>

      <p>
        Keys eventually need to rotate. The naive approach — decrypt every
        row with the old key, re-encrypt with the new — would lock the
        database for a long time on a real-sized dataset. So we version
        the keys:
      </p>

      <ol>
        <li>
          Each encrypted blob carries a key-version byte at its start.
        </li>
        <li>
          Adding a new key is one config push: <code>v2</code> becomes the
          write key, <code>v1</code> stays available for reads.
        </li>
        <li>
          A background re-encryption job walks the table and upgrades
          rows from <code>v1</code> to <code>v2</code> at its own pace.
        </li>
        <li>
          When the job finishes, <code>v1</code> can be retired from the
          secrets manager.
        </li>
      </ol>

      <p>
        No downtime, no lock. The same approach handles the "we suspect a
        key may have leaked" emergency case — flip the write key, let
        reads catch up.
      </p>

      <h2>Threats this design does and doesn't defend against</h2>

      <p>It DOES defend against:</p>
      <ul>
        <li>Stolen database backups</li>
        <li>SQL injection leading to raw row dumps</li>
        <li>Replica server compromise where the attacker can't reach the app server</li>
        <li>Rogue / curious database administrators</li>
        <li>Cross-tenant data leaks (since each vault row decrypts to one user's data only)</li>
      </ul>

      <p>It does NOT defend against:</p>
      <ul>
        <li>
          Full application-server compromise that also gets the encryption
          key from the secrets manager. We harden against this with{' '}
          least-privilege IAM, but a determined attacker with root on the
          API server can read decrypted vault values in transit.
        </li>
        <li>
          Phishing your account credentials. If someone steals your password,
          they log in as you and see your own vault. This is true of every
          system that lets users see their own data.
        </li>
      </ul>

      <h2>The user-facing version</h2>

      <p>
        We boil this down to four bullets on the marketing site: encryption
        at rest, no training, no resale, audited internal access. That's the
        honest summary for non-engineers. This post is for the people who
        want the math underneath.
      </p>

      <p>
        Questions? Email <a href="mailto:security@affixai.com">security@affixai.com</a>{' '}
        — we'll publish answers in a follow-up.
      </p>
    </BlogPostLayout>
  );
}
