# THE 1037 SIGNAL — Code Audit v0.37

## Що реально очищено

- Rest Room: видалено застарілий shell-код v0.31 та весь стек shell-патчів v0.33–v0.36.
- Rest Room: замість них залишено один авторитетний `v0.37 — CLEAN REST ROOM SHELL`.
- Rest Room: прибрано старі v0.12 правила з `position:absolute` для викупленої кімнати, які могли конфліктувати з новою сіткою.
- Bar: два послідовні набори стилів v0.29/v0.30 об'єднано в один canonical Bar block.
- По CSS сайту прибрано 67 правил, селектори яких більше не використовуються в HTML/JS (старі table/daily-choice/claim-summary та застарілі profile/live ефекти).
- По всіх CSS-файлах прибрано byte-identical дублікати правил.

## Перевірки

- Duplicate HTML IDs: 0
- Duplicate `<script src>`: 0
- Duplicate CSS `<link>`: 0
- Missing ID refs у `rest-room.js`: 0
- `!important`: 0
- CSS parse errors: 0
- Exact duplicate CSS rules: 0
- Усі JS-файли: `node --check` OK

## Про повторні селектори у rest-room.css

У `rest-room.css` залишаються повтори селекторів з РІЗНИМИ деклараціями. Це не byte-identical дублікати: частина з них є базовими стилями + responsive/feature refinements для модалки рівнів, пасивного фарму та claim modal. Їх не видалено масово, бо це змінило б поточний вигляд цих окремих компонентів.

Критичний стек, який впливавав саме на layout кімнати та спричиняв накладання секторів, прибрано і замінено одним v0.37 блоком.


## v0.39 typography audit
- CSS files converted to centralized typography tokens: 8
- Converted files: css/responsive/desktop.css, css/responsive/mobile.css, css/responsive/mobile-small.css, css/components/rest-room.css, css/components/hud.css, css/components/navigation.css, css/components/profile-modal.css, css/screens/world.css
- No direct `font-size: Npx` declarations are intended outside `css/core/variables.css`.
- Small UI typography now has a 10px minimum token instead of legacy 5.8–9px values.


## v0.41
- Bar hero overlay hidden via CSS only; source artwork unchanged.
- Right Bar column uses isolated vertical overflow.
