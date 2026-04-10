import type { StrapiApp } from '@strapi/strapi/admin';
import { setPluginConfig, StrapiMediaLib, StrapiUploadAdapter } from '@_sh/strapi-plugin-ckeditor';
import {
  Bold, Italic, Strikethrough, Underline,
  Essentials, Heading, Paragraph,
  Link, AutoLink,
  Image, ImageCaption, ImageStyle, ImageToolbar, ImageUpload, ImageResize,
  List, TodoList,
  BlockQuote,
  Table, TableToolbar, TableProperties, TableCellProperties,
  MediaEmbed,
  HorizontalLine,
  Alignment,
  Indent, IndentBlock,
  Font,
  HtmlEmbed,
  SourceEditing,
  RemoveFormat,
  FindAndReplace,
  CodeBlock,
  Highlight,
  SpecialCharacters, SpecialCharactersEssentials,
  GeneralHtmlSupport,
  PasteFromOffice,
} from 'ckeditor5';

const articlePreset = {
  name: 'articleEditor',
  description: 'Полнофункциональный редактор для статей АНО «Единый Мир»',
  editorConfig: {
    licenseKey: 'GPL',
    plugins: [
      Bold, Italic, Strikethrough, Underline,
      Essentials, Heading, Paragraph,
      Link, AutoLink,
      Image, ImageCaption, ImageStyle, ImageToolbar, ImageUpload, ImageResize,
      List, TodoList,
      BlockQuote,
      Table, TableToolbar, TableProperties, TableCellProperties,
      MediaEmbed,
      HorizontalLine,
      Alignment,
      Indent, IndentBlock,
      Font,
      HtmlEmbed,
      SourceEditing,
      RemoveFormat,
      FindAndReplace,
      CodeBlock,
      Highlight,
      SpecialCharacters, SpecialCharactersEssentials,
      GeneralHtmlSupport,
      PasteFromOffice,
      StrapiMediaLib,
      StrapiUploadAdapter,
    ],
    toolbar: {
      items: [
        'heading', '|',
        'bold', 'italic', 'underline', 'strikethrough', '|',
        'link', 'strapiMediaLib', 'mediaEmbed', 'blockQuote', '|',
        'bulletedList', 'numberedList', 'todoList', '|',
        'alignment', 'indent', 'outdent', '|',
        'insertTable', 'horizontalLine', 'specialCharacters', '|',
        'highlight', 'fontSize', 'fontColor', '|',
        'codeBlock', 'htmlEmbed', 'sourceEditing', '|',
        'findAndReplace', 'removeFormat', '|',
        'undo', 'redo',
      ],
      shouldNotGroupWhenFull: true,
    },
    heading: {
      options: [
        { model: 'paragraph', title: 'Paragraph', class: 'ck-heading_paragraph' },
        { model: 'heading2', view: 'h2', title: 'Heading 2', class: 'ck-heading_heading2' },
        { model: 'heading3', view: 'h3', title: 'Heading 3', class: 'ck-heading_heading3' },
        { model: 'heading4', view: 'h4', title: 'Heading 4', class: 'ck-heading_heading4' },
      ],
    },
    image: {
      toolbar: [
        'imageStyle:block', 'imageStyle:side', '|',
        'imageTextAlternative', 'toggleImageCaption',
      ],
      resizeUnit: '%',
      resizeOptions: [
        { name: 'resizeImage:original', value: null, label: 'Original' },
        { name: 'resizeImage:50', value: '50', label: '50%' },
        { name: 'resizeImage:75', value: '75', label: '75%' },
      ],
    },
    table: {
      contentToolbar: [
        'tableColumn', 'tableRow', 'mergeTableCells',
        'tableProperties', 'tableCellProperties',
      ],
    },
    htmlSupport: {
      allow: [
        { name: /.*/, attributes: true, classes: true, styles: true },
      ],
    },
    language: 'ru',
  },
};

export default {
  config: {
    locales: ['ru'],
  },
  register(app: StrapiApp) {
    setPluginConfig({
      presets: [articlePreset],
    });
  },
  bootstrap(app: StrapiApp) {
    // Custom admin bootstrap logic if needed
  },
};
