# THE 1037 SIGNAL — Project Status

## Version
v0.42 — Bar clean hero + isolated right-column scroll

## Що змінено
- Повністю прибрано стек shell-патчів Rest Room v0.33–v0.36 і замінено одним авторитетним блоком v0.37.
- Видалено застарілі shell-правила v0.31, які все ще могли впливати на нову верстку.
- Права колонка кімнати тепер є єдиним desktop scroll-контейнером; ліва сцена не скролиться.
- Картки «Твоя кімната», «Запаси кімнати» та «Наступне покращення» мають природну висоту та не можуть накладатися одна на одну.
- Прибрано процентні/розтягувальні висоти з «Наступного покращення».
- Старі Bar v0.29/v0.30 CSS-блоки об’єднано в один canonical Bar block без дублювання двох версій стилів.
- По всіх CSS-файлах видалено byte-equivalent дублікати правил.

## Перевірки
Див. CODE_AUDIT.md.


## v0.38 — Rest Room Readability
- increased muted/gray text sizes across Rest Room cards, caption text, meta rows, and upgrade card;
- increased action button secondary text size to stay within the requested 10–12px range;
- enabled safer text wrapping to avoid overflow outside card bounds;
- kept scroll behavior only for the right column.


## v0.39 — Global Typography Variables
- centralized site-wide font sizes in `css/core/variables.css`;
- removed scattered hard-coded pixel `font-size` values from component/layout/screen/responsive CSS;
- minimum compact UI text is now 10px; muted/body/button copy is standardized around 10–12px;
- Rest Room action buttons now use the same `--font-size-button` token for primary and secondary copy;
- profile slot labels now use the same global label-size token.
## v0.40 — Bar NPC Scene
- replaced the dedicated Bar hero artwork with the new 1672×941 scene containing 1 bartender and 4 seated NPC visitors;
- added optimized WEBP asset `assets/hub/bar-main-npcs.webp`;
- kept the existing Bar/Casino hub map artwork unchanged.



## v0.41 — Bar Clean Hero + Right Scroll
- прибрано через CSS весь технічний текст, який сайт накладав поверх картинки бару (`БАР «1037»`, `Тепло в Зоні`, опис і нижні пункти);
- сама картинка `bar-main-npcs.webp` не змінювалась;
- права колонка Бару тепер має власний вертикальний скрол, якщо текст не влазить;
- картки правої колонки більше не обрізають текст через фіксовані дробові висоти;
- таймери та довгий текст можуть переноситися без виходу за рамки.


## v0.42 — Rotating Bar Menu + Temporary Buffs
- меню бару тепер реальна механіка: 4 позиції (2 їжі + 2 напої) оновлюються кожні 4 години;
- усі бонуси відсоткові та тимчасові (45–60 хв), тому залишаються корисними на високих рівнях;
- одночасно активна 1 їжа + 1 напій, нова позиція тієї ж категорії замінює стару;
- рівні 10/20/30/40/50 відкривають нові категорії та комбінації, а не безкінечно збільшують %;
- пропозиція дня оновлюється раз на 24 години, діє 90 хв і замінює окрему їжу/напій;
- ціни плавно масштабуються по 10-рівневих діапазонах;
- активні бафи, таймери та баланс грошей оновлюються у HUD;
- доступний API window.GameBar.getModifier(key) для підключення бонусів до бою/EXP/луту.


## v0.43 — Bar menu purchase lock
- Кожну позицію 4-годинного меню можна купити лише один раз за поточну ротацію.
- Після покупки кнопка стає недоступною і показує «Куплено · до оновлення».
- Після автоматичного оновлення меню ліміт скидається.
- Пропозицію дня можна купити один раз за її 24-годинний цикл.
