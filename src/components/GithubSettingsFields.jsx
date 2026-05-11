/** Shared GitHub connection fields for first-run setup and the publish dialog. */
export function GithubSettingsFields({ form, setForm, idPrefix = '', disabled = false, tokenLast = true }) {
  const id = (name) => (idPrefix ? `${idPrefix}-${name}` : name)

  const ownerBlock = (
    <label className="field" htmlFor={id('owner')}>
      <span>GitHub username</span>
      <span className="field-help">Your account name on GitHub (the same one in github.com/your-name).</span>
      <input
        id={id('owner')}
        type="text"
        autoComplete="off"
        value={form.owner}
        onChange={(e) => setForm((f) => ({ ...f, owner: e.target.value }))}
        placeholder="Example: octocat"
        disabled={disabled}
        required
      />
    </label>
  )

  const repoBlock = (
    <label className="field" htmlFor={id('repo')}>
      <span>Repository name</span>
      <span className="field-help">The short name of the project only, not the full web address.</span>
      <input
        id={id('repo')}
        type="text"
        autoComplete="off"
        value={form.repo}
        onChange={(e) => setForm((f) => ({ ...f, repo: e.target.value }))}
        placeholder="Example: my-blog (from github.com/octocat/my-blog)"
        disabled={disabled}
        required
      />
    </label>
  )

  const branchPostsRow = (
    <div className="field-row">
      <label className="field" htmlFor={id('branch')}>
        <span>Branch</span>
        <span className="field-help">Usually main. Must already exist on GitHub.</span>
        <input
          id={id('branch')}
          type="text"
          value={form.branch}
          onChange={(e) => setForm((f) => ({ ...f, branch: e.target.value }))}
          placeholder="main"
          disabled={disabled}
        />
      </label>
      <label className="field" htmlFor={id('postsPath')}>
        <span>Posts folder</span>
        <span className="field-help">Where HTML posts are stored in the repo (slashes like a website path).</span>
        <input
          id={id('postsPath')}
          type="text"
          value={form.postsPath}
          onChange={(e) => setForm((f) => ({ ...f, postsPath: e.target.value }))}
          placeholder="blog/"
          disabled={disabled}
        />
      </label>
    </div>
  )

  const tokenBlock = (
    <label className="field" htmlFor={id('token')}>
      <span>GitHub personal access token</span>
      <span className="field-help">
        A secret key you create on GitHub so this app can save files. Never share it or post it publicly.
      </span>
      <input
        id={id('token')}
        type="password"
        autoComplete="off"
        value={form.token}
        onChange={(e) => setForm((f) => ({ ...f, token: e.target.value }))}
        placeholder="Starts with github_pat_ or ghp_"
        disabled={disabled}
        required
      />
    </label>
  )

  if (tokenLast) {
    return (
      <>
        {ownerBlock}
        {repoBlock}
        {branchPostsRow}
        {tokenBlock}
      </>
    )
  }

  return (
    <>
      {tokenBlock}
      {ownerBlock}
      {repoBlock}
      {branchPostsRow}
    </>
  )
}
