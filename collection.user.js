// ==UserScript==
// @name         PW collection bot
// @namespace    http://tampermonkey.net/
// @version      2024-09-11
// @description  Just refresh the collection page
// @author       Fair Hypocrite
// @match        https://pwonline.ru/minigames.php?game=collection&doo=display*
// @icon         https://pwonline.ru/favicon.ico
// @grant        none
// ==/UserScript==
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

window.addEventListener('load', function() {
    console.log('Страница полностью загружена!');
});

await delay(2000);


class CollectionRoulette {
    constructor(targetCat, debugModeOn) {
        this.currentState = {
            rows: {
                1: 0,
                2: 0,
                3: 0,
                4: 0,
                5: 0,
                6: 0
            },
            quantity: 0
        }
        this.quantityStats = {
            total: 0,
            1: 0,
            2: 0,
            3: 0,
            4: 0,
            5: 0,
            6: 0
        }
        this.targetCategory = targetCat
        this.debugModeOn = debugModeOn
    }

    async getNewState () {
        let rows = {}
        let quantity = 0

        await fetch('https://pwonline.ru/minigames.php?game=collection&doo=info')
            .then(res => res.json())
            .then(res => {
                ({rows, quantity} = res)
            });

        return {
            rows: {
                1: rows.row1,
                2: rows.row2,
                3: rows.row3,
                4: rows.row4,
                5: rows.row5,
                6: rows.row6,
            },
            quantity: parseInt(quantity)
        }
    }

    async openCard() {
        await fetch('https://pwonline.ru/minigames.php?game=collection&doo=turn');
    }

    async pushColumn(category) {
        await fetch(`https://pwonline.ru/minigames.php?game=collection&doo=get_next&category=${category}`);
        this.updateCurrentState(await this.getNewState())

        if (this.debugModeOn) {
            alert('Дебаг!\nСобралась промежуточная ' + category + ' категория.\nСдвигаем дальше.');
        }
    }

    async stopIfTargetReached(category) {
        if (this.currentState.rows[category] === this.resolveCardsLimitByCurrentCategory(category)) {
            if (category < this.targetCategory) {
                await this.pushColumn(category)
                category++
                return false
            } else if (category === this.targetCategory) {
                this.sayTargetReached()

                return true
            } else {
                this.sayTargetOverachieved()

                return true
            }
        }

        return false
    }

    cardsAreOut(currentQuantity) {
        return currentQuantity === 0
    }

    formatStats() {
        const template = 'Статистика:\n' +
            'Всего потрачено карточек: __TOTAL__\n' +
            'Из них:\n' +
            'Первая категория: __1CAT__ | __1PERCENT__%\n' +
            'Вторая категория: __2CAT__ | __2PERCENT__%\n' +
            'Третья категория: __3CAT__ | __3PERCENT__%\n' +
            'Четвертая категория: __4CAT__ | __4PERCENT__%\n' +
            'Пятая категория: __5CAT__ | __5PERCENT__%\n' +
            'Шестая категория: __6CAT__ | __6PERCENT__%\n'

        let response = template.replace('__TOTAL__', this.quantityStats.total)

        for (let i = 1; i < 7; i++) {
            response = response
                .replace('__' + i + 'CAT__', this.quantityStats[i])
                .replace('__' + i + 'PERCENT__', this.getPercentage(i))
        }

        return response
    }

    getPercentage(category) {
        if (this.quantityStats.total === 0) {
            return 0
        }
        return (this.quantityStats[category] * 100) / this.quantityStats.total
    }

    sayCardsAreOut() {
        alert('Карточки закончились!\n' + this.formatStats());
    }

    sayTargetReached() {
        alert('Получилось собрать нужную категорию!\n' + this.formatStats());
    }

    sayTargetOverachieved() {
        alert('Собрана категория более высокого уровня!\n' + this.formatStats());
    }

    sayStats() {
        alert(this.formatStats());
    }

    sayCurrentState() {
        alert('Текущее состояние:\n' + JSON.stringify(this.currentState, null, "\t"));
    }

    checkCurrentTargetCat() {
        return confirm('Внимание!\nНачинаем собирать категорию номер ' + this.targetCategory)
    }

    resolveCardsLimitByCurrentCategory(category) {
        return category === 6 ? 10 : 5
    }

    updateCurrentState(newState) {
        if (newState.hasOwnProperty('quantity')) {
            this.currentState.quantity = newState.quantity
        } else {
            alert('Ошибка:\nПараметр quantity отсутствует в newState')
        }

        if (newState.hasOwnProperty('rows')) {
            this.currentState.rows = {...newState.rows}
        } else {
            alert('Ошибка:\nПараметр rows отсутствует в newState')
        }
    }

    updateStats(category) {
        this.quantityStats[category]++;
        this.quantityStats.total++;
    }

    resolveNewCardCategory(newState) {
        if (this.debugModeOn) {
            alert('Дебаг!\nНовое состояние\n' + JSON.stringify(newState.rows, null, "\t") + '\nТекущее состояние:\n' + JSON.stringify(this.currentState.rows, null, "\t"));
        }

        for (let category in this.currentState.rows) {
            if (newState.rows[category] > this.currentState.rows[category]) {
                if (this.debugModeOn) {
                    alert('Дебаг!\nНовая карточка упала в ' + category + ' категорию.\nТеперь их ' + newState.rows[category]);
                }
                return category
            }
        }
        alert('Ошибка:\nПроблема с получением выпавшей категории!!!');
    }

    async process() {
        if (this.checkCurrentTargetCat()) {
            await this.spin()
        }
    }

    async spin() {
        let newState = await this.getNewState()
        this.updateCurrentState(newState)

        let index = 0
        while (true) {
            if (index % 5 === 0 && this.debugModeOn) {
                this.sayCurrentState()
                this.sayStats()
            }

            let shouldStopHere = false
            for (let currentCategory = 1; currentCategory <= 6; currentCategory++) {
                shouldStopHere = await this.stopIfTargetReached(currentCategory)
                if (shouldStopHere) {
                    break
                }
            }

            if (shouldStopHere) {
                break
            }

            await this.openCard()
            newState = await this.getNewState();

            const newCardCategory = this.resolveNewCardCategory(newState)

            this.updateStats(newCardCategory)
            this.updateCurrentState(newState)

            if (this.cardsAreOut(newState.quantity)) {
                this.sayCardsAreOut()
                break;
            }

            index++
        }
    }
}

if (confirm('Запустить скрипт разбора карточек?')) {
    let targetCat = prompt('Введите пожалуйста целевую категорию для сбора от 1 до 6');
    if (
        targetCat === null
        || targetCat === ""
        || isNaN(targetCat)
        || parseInt(targetCat) < 1
        || parseInt(targetCat) > 6
    ) {
        alert('Категория введена неверно.\nВы ошиблись.\nПора научиться считать до шести!')
    } else {
        let debugModeOn = false
        const debugModeConfirmationMessage = 'Внимание!\n' +
            'Включить НЕ обязательный Интерактивный режим?\n' +
            'Это потребует личного присутствия за компьютером и ручных действий в процессе.\n' +
            'Не рекомендуется для обычного сценария использования.\n' +
            'Жми отмену!!!'
        if (confirm(debugModeConfirmationMessage)) {
            debugModeOn = true
        }
        const roulette = new CollectionRoulette(targetCat, debugModeOn)
        await roulette.process()
    }
}
