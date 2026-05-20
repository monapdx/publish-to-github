/**
 * Read-only /templates bundled with the app (never written to the repo).
 */
import indexDesignHtml from '../../templates/index.html?raw'
import stylesCss from '../../templates/styles.css?raw'
import postCardTemplateHtml from '../../templates/post-card-template.html?raw'
import postPageTemplateHtml from '../../templates/post-page-template.html?raw'
import githubPagesWorkflowYaml from '../../templates/github-pages-blog.yml?raw'

export const READ_ONLY_TEMPLATES = {
  indexDesignHtml,
  stylesCss,
  postCardTemplateHtml,
  postPageTemplateHtml,
  githubPagesWorkflowYaml,
}
