/**
 * Read-only copies of /templates bundled with the app.
 * Never written back to disk; used only as publish sources.
 */
import indexDesignHtml from '../../templates/index.html?raw'
import indexStarterHtml from '../../templates/index-starter.html?raw'
import stylesCss from '../../templates/styles.css?raw'
import postCardTemplateHtml from '../../templates/post-card-template.html?raw'
import postPageTemplateHtml from '../../templates/post-page-template.html?raw'
import githubPagesWorkflowYaml from '../../templates/github-pages-blog.yml?raw'

export const READ_ONLY_TEMPLATES = {
  indexDesignHtml,
  indexStarterHtml,
  stylesCss,
  postCardTemplateHtml,
  postPageTemplateHtml,
  githubPagesWorkflowYaml,
}
