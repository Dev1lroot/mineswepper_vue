var root = new Vue({
    el: "main",
    data: {
        status: 0,
        level: 1,
        bombs: 20,
        matrix: [],
        overlay: [],
    },
    methods: {
        createField: function ()
        {
            // Устанавливаем значение бомб (стартовое 20, каждый уровень +5)
            this.bombs = (this.level * 5 + 15);

            // Устанавливаем значение площади (стартовая 2 на 2 и каждый уровень +1)
            width = 10 + 1 * this.level;
            height = width;


            // Верхний слой (статус клетки) и нижний слой (тип клетки)
            this.overlay = [];
            this.matrix = [];
            
            // Генерим массив, поле
            for (var x = 0; x < width; x++)
            {
                this.overlay[x] = [];
                this.matrix[x] = [];

                for(var y = 0; y < height; y++)
                {
                    this.matrix[x][y] = "-";
                    this.overlay[x][y] = 1;
                }
            }

            // Размещаем бомбы рандомно но определенное колличество
            var bombs_planted = 0;
            for (var i = 0; i < this.bombs; i++) for (var x = 0; x < width; x++) for(var y = 0; y < height; y++)
            {
                if(this.bombs > bombs_planted && Math.random() > 0.98)
                {
                    this.matrix[x][y] = "*";
                    bombs_planted++;
                }
            }
            
            // Размещаем цифры вокруг бомб
            for (var x = 0; x < width; x++)
            {
                for(var y = 0; y < height; y++)
                {
                    let bombs = this.bombsNear(x,y);
                    if(this.matrix[x][y] == "-" && bombs > 0) this.matrix[x][y] = bombs;
                }
            }
        },
        bombsNear(x,y)
        {
            let bombs = 0;

            for (var xpos = x-1; xpos < x+2; xpos++)
            {
                for(var ypos = y-1; ypos < y+2; ypos++)
                {
                    if(this.matrix[xpos] != undefined && this.matrix[xpos][ypos] == "*") bombs++;
                }
            }

            return bombs;
        },
        unlockNear(x,y,iterations = 10) // Рекурсивная функция открытия соседних клеток
        {
            var i = iterations - 1;
            if(0 >= i) return 0;

            for (var xpos = x-1; xpos < x+2; xpos++)
            {
                for(var ypos = y-1; ypos < y+2; ypos++)
                {
                    // Если существует такая клетка
                    if(this.matrix[xpos] != undefined && this.matrix[xpos][ypos] != undefined)
                    {
                        // Если она неоткрыта
                        if(this.overlay[xpos][ypos])
                        {
                            // Если это пустое поле
                            if(this.matrix[xpos][ypos] == "-")
                            {
                                this.overlay[xpos][ypos] = 0; // Открыть позицию
                                this.unlockNear(xpos,ypos, i); // Произвести поиск рядом
                            }

                            // Если цифра какая-то
                            if(this.matrix[xpos][ypos] != "*")
                            {
                                this.overlay[xpos][ypos] = 0; // Открыть позицию
                            }
                        }
                    }
                }
            }
        },
        sleep(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        },
        getAround(source_x,source_y,range = 1)
        {
            // Возвращаем все ячейки в радиусе указанном в range
            var coordinates = [];

            for (var xpos = source_x-range; xpos <= source_x+range; xpos++)
            {
                for(var ypos = source_y-range; ypos <= source_y+range; ypos++)
                {
                    if(this.matrix[xpos] != undefined && this.matrix[xpos][ypos] != undefined)
                    {
                        coordinates.push({
                            x: xpos,
                            y: ypos
                        });
                    }
                }
            }

            return coordinates;
        },
        async detonateBomb(x,y)
        {
            // Выполняем действие только если объект это бомба и только если игра проиграна
            if(this.matrix[x] != undefined && this.matrix[x][y] != undefined && this.matrix[x][y] == "*")
            {
                // Вскрываем крышку бомбы
                this.overlay[x][y] = 0;

                // Таймер до взрыва
                await this.sleep(700);

                // Рендерим запуск бомбы
                await this.$forceUpdate();

                // Считаем сколько бомб в зоне взрыва
                var bombs_in_range = 0

                // Проверяем зону 3 на 3
                await this.getAround(x, y).forEach(async (pos) => {

                    // Вычисляем взрывную мощь бомб в зоне
                    if(this.matrix[pos.x][pos.y] == "*") bombs_in_range++;
                });

                // Взрываем зону равную по совокупности всем бомбам в радиусе 3 на 3
                await this.getAround(x, y, bombs_in_range).forEach(async (pos) => {

                    // Уничтожение
                    if(this.status == -1) this.matrix[pos.x][pos.y] = "-";
                    if(this.status == -1) this.overlay[pos.x][pos.y] = 0;
                });

                // Рендерим зону поражения
                await this.$forceUpdate();

                // Ждем до активации следующих бомб
                await this.sleep(200);

                // Подаем сигнал взрыва всем примыкающим к границе взрыва бомбам
                await this.getAround(x, y, bombs_in_range+2).forEach(async (pos) => {

                    // Уничтожение
                    if(this.status == -1) if(this.matrix[pos.x][pos.y] == "*") this.detonateBomb(pos.x, pos.y);
                });

                // Рендерим активные бомбы
                await this.$forceUpdate();
            }
        },
        gameOver: function()
        {
            this.level = 1;
            this.status = 0;
            alert("Игра окончена");
            this.createField();
        },
        openBlock: function(x,y)
        {
            // Если игра активна и клетка не заблокирована
            if(this.status == 0 && this.overlay[x][y] != -1)
            {
                // Стираем клетку
                this.overlay[x][y] = 0;

                // Если тыкнул в бимбу
                if(this.matrix[x][y] == "*")
                {
                    // Показываем что игра проиграна
                    this.status = -1;
                    
                    // Взрываем бомбу вместе с цепной реакцией
                    this.detonateBomb(x,y);
                    
                    // Вызываем вариант начать игру заново
                    setTimeout(() => {this.gameOver();},3000);

                    // Ререндер после нажания
                    this.$forceUpdate();
                    return 0;
                }
    
                // Если тыкнул в пустоту
                if(this.matrix[x][y] == "-")
                {
                    // Рекурсивный обвал
                    this.unlockNear(x,y,40);
                }

                // Если бомб столько-же сколько неоткрытых клеток то это победа
                if(this.lockedMarks() == this.bombs)
                {
                    this.level++;
                    this.createField();
                }
            }
            // Ререндер после нажания
            this.$forceUpdate();
        },
        markBlock: function(x,y)
        {
            // Если игра активна и клетка не открыта
            if(this.status == 0 && this.overlay[x][y] != 0)
            {
                this.overlay[x][y] = this.overlay[x][y] * -1; // Инверсия
                this.$forceUpdate();
            }
        },
        unlockedMarks()
        {
            let marks = 0;
            for(var xpos in this.overlay) for(var ypos in this.overlay) if(this.overlay[xpos][ypos] == 0) marks++;
            return marks;
        },
        lockedMarks()
        {
            let marks = 0;
            for(var xpos in this.overlay) for(var ypos in this.overlay) if(this.overlay[xpos][ypos] != 0) marks++;
            return marks;
        },
        totalMarks()
        {
            let marks = 0;
            for(var xpos in this.overlay) for(var ypos in this.overlay) marks++;
            return marks;
        }
    },
    computed: {
    }
});
root.createField();