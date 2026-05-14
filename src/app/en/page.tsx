import HomePage from "@/app/page";

/**
 * EN-локализация главной страницы.
 * Принудительно передаем locale="en", чтобы компонент 
 * запрашивал данные на английском.
 */
export default function EnglishHomePage(props: any) {
  // Мы берем оригинальную страницу и прокидываем в неё язык
  return <HomePage {...props} params={{ ...props.params, locale: "en" }} />;
}