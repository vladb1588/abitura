# -*- coding: utf-8 -*-
"""Смоук-тест UI в реальном браузере: python tests/ui.py
   Требует: pip install playwright && playwright install chromium"""
import pathlib, sys
from playwright.sync_api import sync_playwright

BASE = pathlib.Path(__file__).resolve().parent.parent / 'index.html'

errors, fails = [], []
def check(name, cond):
    print(('ok: ' if cond else 'FAIL: ') + name)
    if not cond: fails.append(name)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 420, 'height': 860})
    page.on('console', lambda m: errors.append('console: ' + m.text) if m.type == 'error' else None)
    page.on('pageerror', lambda e: errors.append('pageerror: ' + str(e)))
    # прогресс, чтобы темы были открыты
    page.add_init_script("localStorage.setItem('altgtu-trainer', JSON.stringify({xp:100, stats:{answers:5,correct:5,lessons:1,exams:0,perfect:0,ai:0,graduated:0,blitzBest:0,history:{}}, levels:{math:{percent:1,powlog:1}}}))")

    page.goto(BASE.as_uri())
    page.wait_for_load_state('networkidle')
    check('главная: заголовок Абитура', page.locator('.hero h1').inner_text() == 'Абитура')

    # математика → теория «Степени и логарифмы» (термин «логарифм» подсвечен)
    page.locator('.subject-card').first.click()
    page.wait_for_timeout(300)
    page.locator('[data-th="1"]').click()
    page.wait_for_timeout(300)
    check('термины подсвечены в теории', page.locator('.term').count() > 0)
    page.locator('.term').first.click()
    page.wait_for_timeout(300)
    check('модалка термина открылась', page.locator('.modal').count() == 1)
    page.locator('#closeM').click()
    page.wait_for_timeout(200)

    # урок: кнопки «Теория» и «Пропустить», фидбек пропуска
    page.locator('[data-act="go"]').click()
    page.wait_for_timeout(400)
    check('в уроке есть кнопка Теория', page.locator('#quizTheory').count() == 1)
    check('в уроке есть кнопка Пропустить', page.locator('#skipQBtn').count() == 1)
    page.locator('#quizTheory').click()
    page.wait_for_timeout(300)
    check('модалка теории из урока открылась', page.locator('.theory-modal').count() == 1)
    page.locator('#closeTh').click()
    page.wait_for_timeout(200)
    page.locator('#skipQBtn').click()
    page.wait_for_timeout(300)
    check('после пропуска показано «Пропущено»', 'Пропущено' in page.locator('.feedback').inner_text())

    browser.close()

print('КОНСОЛЬ ЧИСТАЯ' if not errors else 'ОШИБКИ КОНСОЛИ:')
for e in errors: print(' ', e)
sys.exit(1 if (errors or fails) else 0)
